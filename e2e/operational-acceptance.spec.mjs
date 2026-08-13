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
const password = "RunwayLab-E2E-V2.0B.5!";
const contractLimits = {
  clientDraftId: 80,
  ideaText: 180,
  projectTitle: 50,
  safeProjectTitle: 40,
  targetAudience: 120,
  reviewMessage: 500,
  actionTitle: 40,
  safeActionTitle: 30,
  instructions: 1000,
  completionNote: 1000,
  cancellationReason: 200
};
const shortSuffix = shortUnique();
const runId = `v205-${shortSuffix}`;
const titlePrefix = `V205-${shortSuffix}`;
const flowProjectTitle = safeProjectTitle("Dress");
const protectedProjectTitle = safeProjectTitle("Guard");
const concurrentProjectTitle = safeProjectTitle("Duo");
const actionSuffix = shortSuffix;
const platformActionTitle = safeActionTitle("Platform");
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
let firstActionId;
let platformActionId;
let concurrentIntakeId;
let concurrentProjectId;
let ownerContext;
let adminContext;
let outsiderContext;
let ownerPage;
let adminPage;
let outsiderPage;

function shortUnique() {
  return Date.now().toString(36).slice(-6);
}

function safeProjectTitle(prefix) {
  const value = `E2E ${prefix} ${shortSuffix}`;
  expect(value.length, `${prefix} projectTitle should stay below the test safety limit`).toBeLessThanOrEqual(contractLimits.safeProjectTitle);
  return value;
}

function safeActionTitle(prefix) {
  const value = `E2E ${prefix} ${shortSuffix}`;
  expect(value.length, `${prefix} action title should stay below the test safety limit`).toBeLessThanOrEqual(contractLimits.safeActionTitle);
  return value;
}

function assertStringField(value, field, max, { min = 0, optional = true } = {}) {
  if (value === undefined || value === null) {
    if (!optional) throw new Error(`${field} is required in E2E request data.`);
    return;
  }
  if (typeof value !== "string") throw new Error(`${field} must be a string in E2E request data.`);
  const length = value.trim().length;
  if (length < min || length > max) {
    throw new Error(`${field} length ${length} is outside E2E-safe contract range ${min}-${max}: ${value}`);
  }
}

function assertEnumField(value, field, allowed, { optional = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return;
    throw new Error(`${field} is required in E2E request data.`);
  }
  if (!allowed.includes(value)) {
    throw new Error(`${field}=${value} is not one of: ${allowed.join(", ")}`);
  }
}

function preflightRequestBody(path, body, method) {
  if (method === "GET") return;
  if (!body || typeof body !== "object" || Array.isArray(body)) return;

  if (path === "/api/start-projects") {
    assertStringField(body.clientDraftId, "clientDraftId", contractLimits.clientDraftId, { min: 8, optional: false });
    assertEnumField(body.sourceType, "sourceType", ["DESIGN", "IDEA", "AUDIENCE", "STORE", "BRAND"]);
    assertEnumField(body.category, "category", ["DRESS", "SHIRT", "OUTERWEAR", "SET", "SKIRT", "PANTS", "LIGHT_FORMAL", "KNIT", "OTHER"]);
    assertEnumField(body.primaryNeed, "primaryNeed", ["DESIGN_DIRECTION", "FABRIC", "SAMPLE", "PRODUCTION", "MARKET_VALIDATION", "UNSURE"]);
    assertStringField(body.categoryOther, "categoryOther", 40);
    assertStringField(body.ideaText, "ideaText", contractLimits.ideaText);
  }

  if (/^\/api\/start-projects\/[^/]+$/.test(path) && method === "PATCH") {
    assertStringField(body.projectTitle, "projectTitle", contractLimits.projectTitle, { min: 2 });
    assertStringField(body.projectTitle, "projectTitle", contractLimits.safeProjectTitle, { min: 2 });
    assertStringField(body.ideaText, "ideaText", contractLimits.ideaText);
    assertStringField(body.targetAudience, "targetAudience", contractLimits.targetAudience, { min: 2 });
    assertEnumField(body.useScenario, "useScenario", ["DAILY_COMMUTE", "WEEKEND", "DATE_PARTY", "FORMAL", "TRAVEL", "STAGE_PHOTO", "STORE_SALES", "OTHER", "UNSURE"], { optional: true });
    assertEnumField(body.expectedPriceBand, "expectedPriceBand", ["UNDER_299", "FROM_300_TO_599", "FROM_600_TO_999", "FROM_1000_TO_1999", "FROM_2000", "UNSURE"], { optional: true });
    assertEnumField(body.launchTiming, "launchTiming", ["WITHIN_30_DAYS", "ONE_TO_THREE_MONTHS", "THREE_TO_SIX_MONTHS", "EXPLORING"], { optional: true });
    assertStringField(body.reviewMessage, "reviewMessage", contractLimits.reviewMessage);
  }

  if (/^\/api\/admin\/projects\/[^/]+\/actions$/.test(path)) {
    assertEnumField(body.type, "type", Object.values(CollaborationProjectActionType));
    assertEnumField(body.responsibility, "responsibility", Object.values(CollaborationProjectActionResponsibility));
    assertStringField(body.title, "action title", contractLimits.actionTitle, { min: 2, optional: false });
    assertStringField(body.title, "action title", contractLimits.safeActionTitle, { min: 2, optional: false });
    assertStringField(body.instructions, "instructions", contractLimits.instructions, { min: 5, optional: false });
  }

  if (/\/actions\/[^/]+\/submit$/.test(path) || /\/actions\/[^/]+\/complete$/.test(path)) {
    assertStringField(body.completionNote, "completionNote", contractLimits.completionNote);
  }

  if (/\/actions\/[^/]+\/cancel$/.test(path)) {
    assertStringField(body.reason, "cancellationReason", contractLimits.cancellationReason, { min: 10, optional: false });
  }
}

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
  const projects = await prisma.collaborationProject.findMany({
    where: {
      OR: [
        { title: { startsWith: titlePrefix } },
        ...(userIds.length ? [{ ownerUserId: { in: userIds } }, { createdById: { in: userIds } }] : [])
      ]
    },
    select: { id: true }
  });
  const projectIds = projects.map((project) => project.id);
  const intakes = await prisma.projectIntake.findMany({
    where: {
      OR: [
        { clientDraftId: { startsWith: "e2e-v205-" } },
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
  preflightRequestBody(path, body, method);
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

async function createCompleteIntake(page, clientDraftId, title) {
  const created = await expectPostOk(page, "/api/start-projects", {
    clientDraftId,
    sourceType: "IDEA",
    category: "DRESS",
    primaryNeed: "FABRIC",
    ideaText: "想做一件通勤的连衣裙"
  });
  const id = created.intake.id;
  await expectPostOk(page, `/api/start-projects/${id}`, {
    projectTitle: title,
    ideaText: "想做一件通勤的连衣裙",
    targetAudience: "刚上班的女生",
    useScenario: "DAILY_COMMUTE",
    expectedPriceBand: "UNDER_299",
    launchTiming: "ONE_TO_THREE_MONTHS",
    reviewMessage: "希望先找面料并确认开发方向。"
  }, "PATCH");
  return id;
}

async function getIntake(id = intakeId) {
  return prisma.projectIntake.findUniqueOrThrow({
    where: { id },
    include: { events: true, linkedCollaborationProject: true }
  });
}

async function getFlowProject(id = flowProjectId) {
  return prisma.collaborationProject.findUniqueOrThrow({
    where: { id },
    include: {
      actions: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      projectIntake: true
    }
  });
}

async function countOpenActions(projectId = flowProjectId) {
  return prisma.collaborationProjectAction.count({
    where: {
      projectId,
      status: { in: [CollaborationProjectActionStatus.ACTIVE, CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION] }
    }
  });
}

async function expectNoHorizontalOverflow(page, path) {
  await page.goto(path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${path} should not overflow horizontally`).toBeLessThanOrEqual(0);
  const primaryName = /继续|新建项目|返回我的项目|启动项目|创建我的项目/;
  await expect(page.getByRole("link", { name: primaryName }).or(page.getByRole("button", { name: primaryName })).first()).toBeVisible();
}

function duplicateKeys(items, keyFn) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

async function expectSimpleNotificationDedup(projectId = flowProjectId) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: owner.id,
      type: NotificationType.REQUEST_HANDLED,
      linkUrl: projectHref(projectId)
    },
    select: { title: true, linkUrl: true }
  });
  expect(duplicateKeys(notifications, (notification) => `${notification.title}:${notification.linkUrl}`)).toEqual([]);
}

test.describe.serial("V2.0B.5 simple project experience acceptance", () => {
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

  test("owner logs in and creates a real start project intake from /start", async () => {
    await login(ownerPage, ownerEmail);
    await ownerPage.goto("/start");
    await expect(ownerPage).toHaveURL(/\/start/);

    const created = await expectPostOk(ownerPage, "/api/start-projects", {
      clientDraftId: `e2e-v205-${runId}`,
      sourceType: "IDEA",
      category: "DRESS",
      primaryNeed: "FABRIC",
      ideaText: "想做一件通勤的连衣裙"
    });
    intakeId = created.intake.id;

    await ownerPage.goto(created.href);
    await expect(ownerPage.locator("body")).toContainText("想做一件通勤的连衣裙");

    const intake = await getIntake();
    expect(intake.ownerId).toBe(owner.id);
    expect(intake.status).toBe(ProjectIntakeStatus.DRAFT);
    expect(intake.linkedCollaborationProjectId).toBeNull();
  });

  test("owner completes details and launches the project without admin review", async () => {
    await expectPostOk(ownerPage, `/api/start-projects/${intakeId}`, {
      projectTitle: flowProjectTitle,
      ideaText: "想做一件通勤的连衣裙",
      targetAudience: "刚上班的女生",
      useScenario: "DAILY_COMMUTE",
      expectedPriceBand: "UNDER_299",
      launchTiming: "ONE_TO_THREE_MONTHS",
      reviewMessage: "希望先找面料并确认开发方向。"
    }, "PATCH");
    const launched = await expectPostOk(ownerPage, `/api/start-projects/${intakeId}/submit`, {});
    flowProjectId = launched.project.id;

    const intake = await getIntake();
    const project = await getFlowProject(flowProjectId);
    const action = project.actions[0];
    firstActionId = action.id;

    expect(intake.status).toBe(ProjectIntakeStatus.ACCEPTED);
    expect(intake.completion).toBe(100);
    expect(intake.reviewedById).toBeNull();
    expect(intake.linkedCollaborationProjectId).toBe(flowProjectId);
    expect(project.visibility).toBe(CollaborationProjectVisibility.PRIVATE);
    expect(project.status).toBe(CollaborationProjectStatus.DRAFT);
    expect(project.ownerUserId).toBe(owner.id);
    expect(await prisma.collaborationProject.count({ where: { projectIntake: { id: intakeId } } })).toBe(1);
    expect(await countOpenActions()).toBe(1);
    expect(action.type).toBe(CollaborationProjectActionType.DESIGN_CLARIFICATION);
    expect(action.responsibility).toBe(CollaborationProjectActionResponsibility.USER);
    expect(action.status).toBe(CollaborationProjectActionStatus.ACTIVE);
    expect(action.title).toBe("完善产品需求");
    expect(project.events.filter((event) => event.eventType === CollaborationProjectEventType.PROJECT_CREATED)).toHaveLength(1);
    expect(project.events.filter((event) => event.eventType === CollaborationProjectEventType.ACTION_CREATED)).toHaveLength(1);
    expect(intake.events.some((event) => event.eventType === ProjectIntakeEventType.CONVERTED)).toBe(true);
  });

  test("repeat launch is idempotent and does not duplicate project, action, event, or notification", async () => {
    const eventCountBefore = await prisma.collaborationProjectEvent.count({ where: { projectId: flowProjectId } });
    const notificationCountBefore = await prisma.notification.count({ where: { userId: owner.id, linkUrl: projectHref(flowProjectId) } });
    const relaunched = await expectPostOk(ownerPage, `/api/start-projects/${intakeId}/submit`, {});
    expect(relaunched.project.id).toBe(flowProjectId);
    expect(relaunched.idempotent).toBe(true);

    expect(await prisma.collaborationProject.count({ where: { projectIntake: { id: intakeId } } })).toBe(1);
    expect(await countOpenActions()).toBe(1);
    expect(await prisma.collaborationProjectEvent.count({ where: { projectId: flowProjectId } })).toBe(eventCountBefore);
    expect(await prisma.notification.count({ where: { userId: owner.id, linkUrl: projectHref(flowProjectId) } })).toBe(notificationCountBefore);
    await expectSimpleNotificationDedup();
  });

  test("owner /me/projects shows the project once with simple user-facing copy", async () => {
    await ownerPage.goto("/me/projects");
    const projectHrefValue = projectHref(flowProjectId);
    const projectCards = ownerPage.locator(`article:has(a[href="${projectHrefValue}"])`);
    await expect(projectCards).toHaveCount(1);
    await expect(projectCards.first()).toContainText(flowProjectTitle);
    await expect(projectCards.first()).toContainText("继续");
    await expect(ownerPage.locator(`article:has(a[href="/me/start-projects/${intakeId}"])`)).toHaveCount(0);
    const body = ownerPage.locator("body");
    await expect(body).not.toContainText("正式项目");
    await expect(body).not.toContainText("启动草稿");
    await expect(body).not.toContainText("等待平台评估");
  });

  test("owner project detail shows USER active work as now-to-do without internal vocabulary", async () => {
    await ownerPage.goto(projectHref(flowProjectId));
    const body = ownerPage.locator("body");
    await expect(body).toContainText(flowProjectTitle);
    await expect(body).toContainText("现在要做");
    await expect(body).toContainText("完善产品需求");
    await expect(body).not.toContainText("USER");
    await expect(body).not.toContainText("PLATFORM");
    await expect(body).not.toContainText("当前行动");
    await expect(body).not.toContainText("CollaborationProject");
  });

  test("owner submits the first action result and sees a received state", async () => {
    const eventCountBefore = await prisma.collaborationProjectEvent.count({
      where: { projectId: flowProjectId, actionId: firstActionId, eventType: CollaborationProjectEventType.USER_RESULT_SUBMITTED }
    });
    const notificationCountBefore = await prisma.notification.count({ where: { userId: owner.id, linkUrl: projectHref(flowProjectId) } });
    const submitted = await expectPostOk(ownerPage, `/api/me/projects/collaboration/${flowProjectId}/actions/${firstActionId}/submit`, {
      completionNote: "已经补充通勤连衣裙的面料、颜色和场景要求。"
    });
    expect(submitted.action.status).toBe(CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION);

    const action = await prisma.collaborationProjectAction.findUniqueOrThrow({ where: { id: firstActionId } });
    expect(action.status).toBe(CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION);
    expect(await countOpenActions()).toBe(1);
    expect(await prisma.collaborationProjectEvent.count({
      where: { projectId: flowProjectId, actionId: firstActionId, eventType: CollaborationProjectEventType.USER_RESULT_SUBMITTED }
    })).toBe(eventCountBefore + 1);
    expect(await prisma.notification.count({ where: { userId: owner.id, linkUrl: projectHref(flowProjectId) } })).toBe(notificationCountBefore);
    await expectSimpleNotificationDedup();

    await ownerPage.goto(projectHref(flowProjectId));
    await expect(ownerPage.locator("body")).toContainText("已收到");
  });

  test("admin confirms the user step and creates a platform action shown as processing to the owner", async () => {
    await login(adminPage, adminEmail);
    const completed = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions/${firstActionId}/complete`, {
      completionNote: "Admin confirmed the V2.0B.5 owner first-step result."
    });
    expect(completed.action.status).toBe(CollaborationProjectActionStatus.COMPLETED);
    expect(await countOpenActions()).toBe(0);

    const created = await expectPostOk(adminPage, `/api/admin/projects/${flowProjectId}/actions`, {
      type: CollaborationProjectActionType.PLATFORM_PREPARATION,
      responsibility: CollaborationProjectActionResponsibility.PLATFORM,
      title: platformActionTitle,
      instructions: "Platform prepares a fabric direction for this simple project experience."
    });
    platformActionId = created.action.id;
    expect(created.action.status).toBe(CollaborationProjectActionStatus.ACTIVE);
    expect(await countOpenActions()).toBe(1);

    await ownerPage.goto(projectHref(flowProjectId));
    const body = ownerPage.locator("body");
    await expect(body).toContainText("我们正在处理");
    await expect(body).not.toContainText("PLATFORM");
  });

  test("outsider cannot read owner project, submit owner action, or access admin controls", async () => {
    await login(outsiderPage, outsiderEmail);

    const privateResponse = await outsiderPage.goto(projectHref(flowProjectId));
    expect(privateResponse?.status()).toBe(404);
    await expect(outsiderPage.locator("body")).not.toContainText(flowProjectTitle);
    await expect(outsiderPage.locator("body")).not.toContainText(ownerEmail);

    const submitAttempt = await browserJson(outsiderPage, `/api/me/projects/collaboration/${flowProjectId}/actions/${platformActionId}/submit`, {
      completionNote: "Outsider should not be able to submit this owner action."
    });
    expect(submitAttempt.status).toBe(404);
    expect(JSON.stringify(submitAttempt.json ?? submitAttempt.text)).not.toContain(flowProjectTitle);
    expect(JSON.stringify(submitAttempt.json ?? submitAttempt.text)).not.toContain(ownerEmail);

    const adminApiAttempt = await browserJson(outsiderPage, `/api/admin/projects/${flowProjectId}/actions`, {
      type: CollaborationProjectActionType.DESIGN_CLARIFICATION,
      responsibility: CollaborationProjectActionResponsibility.USER,
      title: `E2E denied ${actionSuffix}`,
      instructions: "This outsider admin request should be rejected before project details leak."
    });
    expect(adminApiAttempt.status).toBe(403);
    expect(JSON.stringify(adminApiAttempt.json ?? adminApiAttempt.text)).not.toContain(flowProjectTitle);

    await outsiderPage.goto("/admin/projects");
    await expect(outsiderPage.locator("body")).toContainText("403");
    await expect(outsiderPage.locator("body")).not.toContainText(flowProjectTitle);
  });

  test("concurrent duplicate launch creates exactly one project and one unfinished first action", async () => {
    concurrentIntakeId = await createCompleteIntake(ownerPage, `e2e-v205-concurrent-${runId}`, concurrentProjectTitle);
    const [first, second] = await Promise.all([
      browserJson(ownerPage, `/api/start-projects/${concurrentIntakeId}/submit`, {}),
      browserJson(ownerPage, `/api/start-projects/${concurrentIntakeId}/submit`, {})
    ]);
    expect([first.status, second.status].every((status) => status >= 200 && status < 300)).toBe(true);
    concurrentProjectId = first.json.project.id;
    expect(second.json.project.id).toBe(concurrentProjectId);

    const intake = await getIntake(concurrentIntakeId);
    const project = await getFlowProject(concurrentProjectId);
    expect(intake.linkedCollaborationProjectId).toBe(concurrentProjectId);
    expect(await prisma.collaborationProject.count({ where: { projectIntake: { id: concurrentIntakeId } } })).toBe(1);
    expect(await countOpenActions(concurrentProjectId)).toBe(1);
    expect(project.actions.filter((action) => action.status === CollaborationProjectActionStatus.ACTIVE)).toHaveLength(1);
    expect(project.events.filter((event) => event.eventType === CollaborationProjectEventType.PROJECT_CREATED)).toHaveLength(1);
    expect(project.events.filter((event) => event.eventType === CollaborationProjectEventType.ACTION_CREATED)).toHaveLength(1);
    await expectSimpleNotificationDedup(concurrentProjectId);
  });

  test("responsive smoke has no horizontal overflow and keeps primary actions visible", async () => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 1440, height: 900 }
    ]) {
      await ownerPage.setViewportSize(viewport);
      await expectNoHorizontalOverflow(ownerPage, "/start");
      await expectNoHorizontalOverflow(ownerPage, "/me/projects");
      await expectNoHorizontalOverflow(ownerPage, projectHref(flowProjectId));
    }
  });
});
