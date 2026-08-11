import { expect, test } from "@playwright/test";
import * as bcrypt from "bcryptjs";
import * as PrismaClientPackage from "@prisma/client";

const {
  PrismaClient,
  UserRole,
  UserStatus,
  UserPersona,
  ProjectIntakeStatus,
  ProjectIntakeEventType,
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  CollaborationProjectActionType,
  CollaborationProjectActionResponsibility,
  CollaborationProjectActionStatus,
  CollaborationProjectEventType,
  NotificationType
} = PrismaClientPackage;

const prisma = new PrismaClient();
const password = "RunwayLab-E2E-P1-03!";
const runId = `p103-${Date.now()}`;
const titlePrefix = "RunwayLab E2E P1-03";
const flowProjectTitle = `${titlePrefix} owner flow ${runId}`;
const protectedProjectTitle = `${titlePrefix} protected ${runId}`;
const actionSuffix = runId.slice(-6);
const userActionTitle = `E2E user ${actionSuffix}`;
const platformActionTitle = `E2E platform ${actionSuffix}`;
const activeUserActionTitle = `E2E fabric ${actionSuffix}`;
const concurrentActionTitleA = `E2E concurrent A ${actionSuffix}`;
const concurrentActionTitleB = `E2E concurrent B ${actionSuffix}`;
const ownerEmail = "e2e-owner@runwaylab.test";
const adminEmail = "e2e-admin@runwaylab.test";
const outsiderEmail = "e2e-outsider@runwaylab.test";
const e2eEmails = [ownerEmail, adminEmail, outsiderEmail];

let owner;
let admin;
let outsider;
let protectedProjectId;
let intakeId;
let flowProjectId;
let userActionId;
let platformActionId;
let cancelledUserActionId;
let concurrentActionId;
let ownerContext;
let adminContext;
let outsiderContext;
let ownerPage;
let adminPage;
let outsiderPage;

function assertIsolatedE2EEnvironment() {
  if (process.env.RUNWAYLAB_E2E !== "1") {
    throw new Error("RUNWAYLAB_E2E=1 is required for operational acceptance E2E.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for operational acceptance E2E.");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();
  const host = parsed.hostname.toLowerCase();
  const urlText = databaseUrl.toLowerCase();
  const looksLikeIsolatedDatabase =
    databaseName === "runwaylab_e2e" ||
    databaseName === "runwaylab_test" ||
    /(^|[_-])(e2e|test|testing)([_-]|$)/.test(databaseName);
  const dangerousHostOrName = /(prod|production|primary|supabase|neon|rds|amazonaws|aliyun|railway|render|vercel)/.test(`${host}/${databaseName}`);

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("Operational acceptance E2E only supports PostgreSQL DATABASE_URL values.");
  }
  if (!looksLikeIsolatedDatabase || dangerousHostOrName || urlText.includes("sslmode=require")) {
    throw new Error(`Refusing to seed/cleanup a non-isolated database: host=${host}, database=${databaseName}`);
  }
}

function projectHref(id) {
  return `/me/projects/collaboration/${id}`;
}

async function cleanupE2EData() {
  const users = await prisma.user.findMany({
    where: { email: { in: e2eEmails } },
    select: { id: true }
  });
  const userIds = users.map((user) => user.id);
  const projectWhere = {
    OR: [
      { title: { startsWith: titlePrefix } },
      { internalNote: { startsWith: titlePrefix } },
      ...(userIds.length ? [{ ownerUserId: { in: userIds } }, { createdById: { in: userIds } }] : [])
    ]
  };
  const projects = await prisma.collaborationProject.findMany({
    where: projectWhere,
    select: { id: true }
  });
  const projectIds = projects.map((project) => project.id);
  const intakes = await prisma.projectIntake.findMany({
    where: {
      OR: [
        { clientDraftId: { startsWith: "e2e-p103-" } },
        { projectTitle: { startsWith: titlePrefix } },
        ...(userIds.length ? [{ ownerId: { in: userIds } }] : [])
      ]
    },
    select: { id: true }
  });
  const intakeIds = intakes.map((intake) => intake.id);

  if (projectIds.length) {
    await prisma.collaborationProjectEvent.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.collaborationProjectAction.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.collaborationProject.deleteMany({ where: { id: { in: projectIds } } });
  }

  if (intakeIds.length) {
    await prisma.projectIntakeEvent.deleteMany({ where: { intakeId: { in: intakeIds } } });
    await prisma.projectIntake.deleteMany({ where: { id: { in: intakeIds } } });
  }

  if (userIds.length) {
    await prisma.collaborationProjectEvent.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.collaborationProjectAction.deleteMany({
      where: {
        OR: [{ createdById: { in: userIds } }, { completedById: { in: userIds } }, { cancelledById: { in: userIds } }]
      }
    });
    await prisma.projectIntakeEvent.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.adminLog.deleteMany({ where: { adminId: { in: userIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

async function seedE2EData() {
  const passwordHash = await bcrypt.hash(password, 10);
  owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      passwordHash,
      nickname: "E2E Owner",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      persona: UserPersona.CONSUMER,
      personaCompleted: true
    }
  });
  admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      nickname: "E2E Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      persona: UserPersona.OTHER,
      personaCompleted: true
    }
  });
  outsider = await prisma.user.create({
    data: {
      email: outsiderEmail,
      passwordHash,
      nickname: "E2E Outsider",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      persona: UserPersona.CONSUMER,
      personaCompleted: true
    }
  });
  const protectedProject = await prisma.collaborationProject.create({
    data: {
      title: protectedProjectTitle,
      ownerUserId: owner.id,
      createdById: admin.id,
      status: CollaborationProjectStatus.DRAFT,
      visibility: CollaborationProjectVisibility.PRIVATE,
      internalNote: `${titlePrefix} unauthenticated guard`
    },
    select: { id: true }
  });
  protectedProjectId = protectedProject.id;
}

async function login(page, email) {
  await page.goto("/login");
  await page.locator("input").first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect.poll(() => page.url(), { message: `${email} should leave the login page` }).not.toContain("/login");
}

async function browserJson(page, path, body = {}, method = "POST") {
  return page.evaluate(
    async ({ path: requestPath, body: requestBody, method: requestMethod }) => {
      const response = await fetch(requestPath, {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: requestMethod === "GET" ? undefined : JSON.stringify(requestBody)
      });
      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { ok: response.ok, status: response.status, json, text, path: requestPath, method: requestMethod, requestBody };
    },
    { path, body, method }
  );
}

function sanitizeRequestBody(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeRequestBody);
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /password|token|secret|cookie|authorization/i.test(key) ? "[redacted]" : sanitizeRequestBody(entry)
    ])
  );
}

async function expectPostOk(page, path, body = {}, method = "POST") {
  const response = await browserJson(page, path, body, method);
  const detail = `${method} ${path} should succeed; status=${response.status}; response=${JSON.stringify(response.json ?? response.text)}; request=${JSON.stringify(sanitizeRequestBody(body))}`;
  expect(response.status, detail).toBeGreaterThanOrEqual(200);
  expect(response.status, detail).toBeLessThan(300);
  return response.json;
}

async function getIntake() {
  return prisma.projectIntake.findUniqueOrThrow({
    where: { id: intakeId },
    include: { events: true }
  });
}

async function getFlowProject() {
  return prisma.collaborationProject.findUniqueOrThrow({
    where: { id: flowProjectId },
    include: {
      actions: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      projectIntake: true
    }
  });
}

async function countOpenActions() {
  return prisma.collaborationProjectAction.count({
    where: {
      projectId: flowProjectId,
      status: { in: [CollaborationProjectActionStatus.ACTIVE, CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION] }
    }
  });
}

async function expectAdminListContains(filter, shouldContain) {
  const path = filter ? `/admin/projects?privateFilter=${filter}` : "/admin/projects";
  await adminPage.goto(path);
  const bodyText = await adminPage.locator("body").innerText();
  if (shouldContain) {
    expect(bodyText, `${path} should show ${flowProjectTitle}`).toContain(flowProjectTitle);
  } else {
    expect(bodyText, `${path} should not show ${flowProjectTitle}`).not.toContain(flowProjectTitle);
  }
}

function duplicateKeys(items, keyFn) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

test.describe.serial("V2.0B.4.2.5 P1-03 operational acceptance", () => {
  test.beforeAll(async ({ browser }) => {
    assertIsolatedE2EEnvironment();
    await cleanupE2EData();
    await seedE2EData();

    ownerContext = await browser.newContext();
    adminContext = await browser.newContext();
    outsiderContext = await browser.newContext();
    ownerPage = await ownerContext.newPage();
    adminPage = await adminContext.newPage();
    outsiderPage = await outsiderContext.newPage();
  });

  test.afterAll(async () => {
    await ownerContext?.close();
    await adminContext?.close();
    await outsiderContext?.close();
    await cleanupE2EData();
    await prisma.$disconnect();
  });

  test("protects private projects from unauthenticated visitors", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(projectHref(protectedProjectId));
    expect(page.url()).toContain("/login");
    expect(new URL(page.url()).searchParams.get("next")).toBe(projectHref(protectedProjectId));
    await expect(page.locator("body")).not.toContainText(protectedProjectTitle);
    await context.close();
  });

  test("owner logs in and creates a real ProjectIntake from /start", async () => {
    await login(ownerPage, ownerEmail);
    await ownerPage.goto("/start");
    await expect(ownerPage).toHaveURL(/\/start/);

    const created = await expectPostOk(ownerPage, "/api/start-projects", {
      clientDraftId: `e2e-p103-${runId}`,
      sourceType: "DESIGN",
      category: "DRESS",
      primaryNeed: "SAMPLE",
      ideaText: "Small batch silk dress with a clear fitting and sample plan"
    });
    intakeId = created.intake.id;

    await ownerPage.goto(created.href);
    await expect(ownerPage.locator("body")).toContainText("Small batch silk dress");

    const intake = await getIntake();
    expect(intake.ownerId).toBe(owner.id);
    expect(intake.status).toBe(ProjectIntakeStatus.DRAFT);
    expect(intake.linkedCollaborationProjectId).toBeNull();
  });

  test("owner completes details, submits for review, and database records SUBMITTED", async () => {
    await expectPostOk(ownerPage, `/api/start-projects/${intakeId}`, {
      projectTitle: flowProjectTitle,
      ideaText: "Small batch silk dress with a clear fitting and sample plan",
      targetAudience: "Independent boutique buyers preparing a spring capsule",
      useScenario: "DATE_PARTY",
      expectedPriceBand: "FROM_600_TO_999",
      launchTiming: "ONE_TO_THREE_MONTHS",
      reviewMessage: "Please evaluate whether this should become a private collaboration project."
    }, "PATCH");
    await expectPostOk(ownerPage, `/api/start-projects/${intakeId}/submit`, {});

    await ownerPage.goto(`/me/start-projects/${intakeId}`);
    await expect(ownerPage.locator("body")).toContainText(flowProjectTitle);

    const intake = await getIntake();
    expect(intake.status).toBe(ProjectIntakeStatus.SUBMITTED);
    expect(intake.completion).toBe(100);
    expect(intake.events.some((event) => event.eventType === ProjectIntakeEventType.SUBMITTED)).toBe(true);
  });

  test("admin logs in, accepts the intake, converts it, and database links a PRIVATE project", async () => {
    await login(adminPage, adminEmail);
    let intake = await getIntake();
    const accepted = await expectPostOk(adminPage, `/api/admin/project-intakes/${intakeId}/review`, {
      decision: "ACCEPTED",
      note: "Accepted for an isolated E2E private collaboration workflow.",
      expectedUpdatedAt: intake.updatedAt.toISOString()
    });
    expect(accepted.intake.status).toBe(ProjectIntakeStatus.ACCEPTED);

    intake = await getIntake();
    const converted = await expectPostOk(adminPage, `/api/admin/project-intakes/${intakeId}/convert`, {
      expectedUpdatedAt: intake.updatedAt.toISOString()
    });
    flowProjectId = converted.project.id;

    const project = await getFlowProject();
    intake = await getIntake();
    expect(project.visibility).toBe(CollaborationProjectVisibility.PRIVATE);
    expect(project.status).toBe(CollaborationProjectStatus.DRAFT);
    expect(project.ownerUserId).toBe(owner.id);
    expect(intake.linkedCollaborationProjectId).toBe(flowProjectId);
    expect(project.events.some((event) => event.eventType === CollaborationProjectEventType.PROJECT_CREATED)).toBe(true);
  });

  test("owner /me/projects shows the converted project once and hides the converted intake", async () => {
    await ownerPage.goto("/me/projects");
    const projectHrefValue = projectHref(flowProjectId);
    const projectCards = ownerPage.locator(`article:has(a[href="${projectHrefValue}"])`);
    await expect(projectCards).toHaveCount(1);
    await expect(projectCards.first()).toContainText(flowProjectTitle);
    await expect(ownerPage.locator(`article:has(a[href="/me/start-projects/${intakeId}"])`)).toHaveCount(0);

    const visibleIntakeCount = await prisma.projectIntake.count({
      where: { ownerId: owner.id, linkedCollaborationProjectId: null, projectTitle: flowProjectTitle }
    });
    const privateProjectCount = await prisma.collaborationProject.count({
      where: { id: flowProjectId, ownerUserId: owner.id, visibility: CollaborationProjectVisibility.PRIVATE, title: flowProjectTitle }
    });
    const linkedIntake = await prisma.projectIntake.findUnique({
      where: { id: intakeId },
      select: { linkedCollaborationProjectId: true }
    });
    expect(visibleIntakeCount).toBe(0);
    expect(privateProjectCount).toBe(1);
    expect(linkedIntake?.linkedCollaborationProjectId).toBe(flowProjectId);
  });

  test("admin creates a USER action, owner submits the result, and admin confirms it", async () => {
    const created = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions`, {
      type: CollaborationProjectActionType.DESIGN_CLARIFICATION,
      responsibility: CollaborationProjectActionResponsibility.USER,
      title: userActionTitle,
      instructions: "Upload or describe the fitting decision for this E2E sample plan."
    });
    userActionId = created.action.id;
    expect(created.action.status).toBe(CollaborationProjectActionStatus.ACTIVE);

    let project = await getFlowProject();
    expect(project.actions.find((action) => action.id === userActionId).status).toBe(CollaborationProjectActionStatus.ACTIVE);
    expect(project.events.filter((event) => event.eventType === CollaborationProjectEventType.ACTION_CREATED && event.actionId === userActionId)).toHaveLength(1);

    await ownerPage.goto(projectHref(flowProjectId));
    await expect(ownerPage.locator("body")).toContainText(flowProjectTitle);
    const submitted = await expectPostOk(ownerPage, `/api/me/projects/collaboration/${flowProjectId}/actions/${userActionId}/submit`, {
      completionNote: "Owner completed the E2E fitting decision and submitted it for platform confirmation."
    });
    expect(submitted.action.status).toBe(CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION);

    project = await getFlowProject();
    expect(project.actions.find((action) => action.id === userActionId).status).toBe(CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION);
    expect(await countOpenActions()).toBe(1);
    await expectAdminListContains(null, true);
    await expectAdminListContains("WAITING_CONFIRMATION", true);

    const completed = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions/${userActionId}/complete`, {
      completionNote: "Admin confirmed the owner E2E result."
    });
    expect(completed.action.status).toBe(CollaborationProjectActionStatus.COMPLETED);
  });

  test("admin platform and user-action filters match the operational queue rules", async () => {
    let created = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions`, {
      type: CollaborationProjectActionType.PLATFORM_PREPARATION,
      responsibility: CollaborationProjectActionResponsibility.PLATFORM,
      title: platformActionTitle,
      instructions: "Platform prepares the next production feasibility review."
    });
    platformActionId = created.action.id;
    expect(created.action.status).toBe(CollaborationProjectActionStatus.ACTIVE);

    await expectAdminListContains(null, true);
    await expectAdminListContains("WAITING_PLATFORM", true);

    const platformCompleted = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions/${platformActionId}/complete`, {
      completionNote: "Platform E2E action completed."
    });
    expect(platformCompleted.action.status).toBe(CollaborationProjectActionStatus.COMPLETED);
    expect(await countOpenActions()).toBe(0);
    await expectAdminListContains("WAITING_NEXT", true);

    created = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions`, {
      type: CollaborationProjectActionType.FABRIC_BRIEF,
      responsibility: CollaborationProjectActionResponsibility.USER,
      title: activeUserActionTitle,
      instructions: "Owner should answer one more fabric brief question."
    });
    cancelledUserActionId = created.action.id;
    expect(created.action.status).toBe(CollaborationProjectActionStatus.ACTIVE);

    await expectAdminListContains(null, false);
    await expectAdminListContains("WAITING_USER", true);

    const cancellationEventCountBefore = await prisma.collaborationProjectEvent.count({
      where: { projectId: flowProjectId, actionId: cancelledUserActionId, eventType: CollaborationProjectEventType.ACTION_CANCELLED }
    });
    const notificationCountBeforeCancel = await prisma.notification.count({
      where: { userId: owner.id, type: NotificationType.REQUEST_HANDLED, linkUrl: projectHref(flowProjectId) }
    });
    const cancelled = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions/${cancelledUserActionId}/cancel`, {
      reason: "Cancelling this E2E action to verify rescheduling and retained history."
    });
    expect(cancelled.action.status).toBe(CollaborationProjectActionStatus.CANCELLED);
    expect(await countOpenActions()).toBe(0);

    const cancelledAction = await prisma.collaborationProjectAction.findUniqueOrThrow({
      where: { id: cancelledUserActionId },
      select: { status: true, cancellationReason: true }
    });
    expect(cancelledAction.status).toBe(CollaborationProjectActionStatus.CANCELLED);
    expect(cancelledAction.cancellationReason).toBe("Cancelling this E2E action to verify rescheduling and retained history.");
    expect(await prisma.collaborationProjectEvent.count({
      where: { projectId: flowProjectId, actionId: cancelledUserActionId, eventType: CollaborationProjectEventType.ACTION_CANCELLED }
    })).toBe(cancellationEventCountBefore + 1);
    expect(await prisma.notification.count({
      where: { userId: owner.id, type: NotificationType.REQUEST_HANDLED, linkUrl: projectHref(flowProjectId) }
    })).toBe(notificationCountBeforeCancel + 1);
    const notificationsAfterCancel = await prisma.notification.findMany({
      where: { userId: owner.id, type: NotificationType.REQUEST_HANDLED, linkUrl: projectHref(flowProjectId) },
      select: { title: true, linkUrl: true }
    });
    expect(duplicateKeys(notificationsAfterCancel, (notification) => `${notification.title}:${notification.linkUrl}`)).toEqual([]);

    await expectAdminListContains(null, true);
    await expectAdminListContains("WAITING_USER", false);
    await expectAdminListContains("WAITING_NEXT", true);
    await adminPage.goto(`/admin/projects/${flowProjectId}`);
    const detailText = await adminPage.locator("body").innerText();
    expect(detailText).toContain(flowProjectTitle);
    expect(detailText).toContain(activeUserActionTitle);
    await expect(adminPage.locator('input[maxlength="40"]')).toHaveCount(1);
    await expect(adminPage.locator("select")).toHaveCount(2);
  });

  test("outsider cannot read owner private project, submit owner action, or access admin projects", async () => {
    await login(outsiderPage, outsiderEmail);

    const privateResponse = await outsiderPage.goto(projectHref(flowProjectId));
    expect(privateResponse?.status()).toBe(404);
    await expect(outsiderPage.locator("body")).not.toContainText(flowProjectTitle);
    await expect(outsiderPage.locator("body")).not.toContainText(ownerEmail);
    await expect(outsiderPage.locator("body")).not.toContainText(activeUserActionTitle);

    const submitAttempt = await browserJson(outsiderPage, `/api/me/projects/collaboration/${flowProjectId}/actions/${cancelledUserActionId}/submit`, {
      completionNote: "Outsider should not be able to submit this owner action."
    });
    expect(submitAttempt.status).toBe(404);
    expect(JSON.stringify(submitAttempt.json ?? submitAttempt.text)).not.toContain(flowProjectTitle);
    expect(JSON.stringify(submitAttempt.json ?? submitAttempt.text)).not.toContain(ownerEmail);
    expect(JSON.stringify(submitAttempt.json ?? submitAttempt.text)).not.toContain(activeUserActionTitle);

    const adminApiAttempt = await browserJson(outsiderPage, `/api/admin/projects/${flowProjectId}/actions`, {
      type: CollaborationProjectActionType.DESIGN_CLARIFICATION,
      responsibility: CollaborationProjectActionResponsibility.USER,
      title: `E2E denied ${actionSuffix}`,
      instructions: "This outsider admin request should be rejected before project details leak."
    });
    expect(adminApiAttempt.status).toBe(403);
    expect(JSON.stringify(adminApiAttempt.json ?? adminApiAttempt.text)).not.toContain(flowProjectTitle);
    expect(JSON.stringify(adminApiAttempt.json ?? adminApiAttempt.text)).not.toContain(ownerEmail);

    await outsiderPage.goto("/admin/projects");
    await expect(outsiderPage.locator("body")).toContainText("403");
    await expect(outsiderPage.locator("body")).not.toContainText(flowProjectTitle);
  });

  test("concurrent current-action creation leaves one open action and no duplicate event or notification", async () => {
    expect(await countOpenActions()).toBe(0);
    const eventCountBefore = await prisma.collaborationProjectEvent.count({
      where: { projectId: flowProjectId, eventType: CollaborationProjectEventType.ACTION_CREATED }
    });

    const [first, second] = await Promise.all([
      browserJson(adminPage, `/api/admin/projects/${flowProjectId}/actions`, {
        type: CollaborationProjectActionType.PRODUCTION_FEASIBILITY,
        responsibility: CollaborationProjectActionResponsibility.PLATFORM,
        title: concurrentActionTitleA,
        instructions: "One of the concurrent E2E actions may become the current action."
      }),
      browserJson(adminPage, `/api/admin/projects/${flowProjectId}/actions`, {
        type: CollaborationProjectActionType.SAMPLE_BRIEF,
        responsibility: CollaborationProjectActionResponsibility.PLATFORM,
        title: concurrentActionTitleB,
        instructions: "The second concurrent E2E action must not create a second open action."
      })
    ]);
    const successful = [first, second].filter((response) => response.status >= 200 && response.status < 300);
    const rejected = [first, second].filter((response) => response.status >= 400);
    expect(successful).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].status).toBe(409);
    concurrentActionId = successful[0].json.action.id;
    expect(successful[0].json.action.responsibility).toBe(CollaborationProjectActionResponsibility.PLATFORM);
    expect([CollaborationProjectActionType.PRODUCTION_FEASIBILITY, CollaborationProjectActionType.SAMPLE_BRIEF]).toContain(successful[0].json.action.type);
    expect([concurrentActionTitleA, concurrentActionTitleB]).toContain(successful[0].json.action.title);

    const project = await getFlowProject();
    const openActions = project.actions.filter((action) =>
      [CollaborationProjectActionStatus.ACTIVE, CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION].includes(action.status)
    );
    expect(openActions).toHaveLength(1);
    expect(openActions[0].id).toBe(concurrentActionId);

    const actionCreatedEvents = project.events.filter((event) => event.eventType === CollaborationProjectEventType.ACTION_CREATED);
    expect(actionCreatedEvents.length).toBe(eventCountBefore + 1);
    expect(duplicateKeys(actionCreatedEvents, (event) => `${event.actionId}:${event.eventType}`)).toEqual([]);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: owner.id,
        type: NotificationType.REQUEST_HANDLED,
        linkUrl: projectHref(flowProjectId)
      },
      select: { id: true, title: true, linkUrl: true }
    });
    expect(duplicateKeys(notifications, (notification) => `${notification.title}:${notification.linkUrl}`)).toEqual([]);
    expect(await countOpenActions()).toBe(1);
  });
});
