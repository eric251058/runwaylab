import { PrismaClient } from "@prisma/client";
import {
  ChallengeStatus,
  ContentStatus,
  CooperationType,
  IncubationApplicationStatus,
  IncubationSource,
  IncubationStatus,
  NotificationType,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  RequestStatus,
  ReviewStatus,
  UserRole
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const designerNames = [
  "林知夏",
  "周以宁",
  "许南星",
  "陈白露",
  "顾景川",
  "沈若棠",
  "叶青禾",
  "宋明熙",
  "唐予安",
  "何初晴"
];

const schools = [
  "东华大学",
  "北京服装学院",
  "中国美术学院",
  "广州美术学院",
  "鲁迅美术学院",
  "四川美术学院",
  "清华美院",
  "伦敦艺术大学",
  "香港理工大学",
  "中央圣马丁"
];

const cities = ["上海", "北京", "杭州", "广州", "沈阳", "重庆", "深圳", "伦敦", "香港", "南京"];
const categories = ["女装", "男装", "礼服", "外套", "衬衫", "裤装", "运动装", "童装", "实验设计"];
const workTypes = ["手绘稿", "效果图", "AI辅助设计", "成衣照片", "毕业设计", "系列设计", "旧衣改造", "面料实验"];
const tagPool = ["极简", "复古", "街头", "国风", "可持续", "未来感", "通勤", "机能", "高级感", "浪漫"];
const feelings = ["垂感", "挺括", "轻薄", "厚重", "柔软", "有光泽", "透明", "弹力", "肌理感", "环保感"];

function takeTags(index: number) {
  return [tagPool[index % tagPool.length], tagPool[(index + 3) % tagPool.length], tagPool[(index + 6) % tagPool.length]];
}

function workTitle(index: number) {
  const titles = [
    "雾线廓形实验",
    "城市通勤切片",
    "旧衣再生外套",
    "海盐白礼服",
    "纸感风衣计划",
    "夜行机能套装",
    "软甲针织系列",
    "蓝晒毕业设计",
    "可持续衬衫实验",
    "风声裤装结构"
  ];

  return `${titles[index % titles.length]} ${String(index + 1).padStart(2, "0")}`;
}

async function resetDatabase() {
  await prisma.adminLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.cooperationRequest.deleteMany();
  await prisma.sampleRequest.deleteMany();
  await prisma.fabricRequest.deleteMany();
  await prisma.incubationProject.deleteMany();
  await prisma.incubationApplication.deleteMany();
  await prisma.incubationRecommendation.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.like.deleteMany();
  await prisma.challengeEntry.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.workImage.deleteMany();
  await prisma.work.deleteMany();
  await prisma.designerProfile.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash("RunwayLab123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@runwaylab.test",
      passwordHash,
      nickname: "RunwayLab 管理员",
      role: UserRole.ADMIN
    }
  });

  const designers = await Promise.all(
    designerNames.map((name, index) =>
      prisma.user.create({
        data: {
          email: `designer${index + 1}@runwaylab.test`,
          passwordHash,
          nickname: name,
          avatarUrl: `/uploads/seed/avatar-${index + 1}.webp`,
          role: index % 2 === 0 ? UserRole.STUDENT_DESIGNER : UserRole.NEW_DESIGNER,
          designerProfile: {
            create: {
              school: schools[index],
              city: cities[index],
              designDirection: takeTags(index).join(" / "),
              bio: "关注年轻日常、舞台表达与可持续材料之间的关系。",
              cooperationStatus: index % 3 === 0 ? "接受品牌合作" : "接受打样孵化",
              portfolioCoverUrl: `/uploads/seed/designer-cover-${index + 1}.webp`
            }
          }
        }
      })
    )
  );

  const now = new Date();
  const challenge = await prisma.challenge.create({
    data: {
      title: "第一届「设计上岸」新人设计挑战",
      theme: "让你的设计从作业变成机会",
      coverUrl: "/uploads/seed/challenge-cover.webp",
      description: "面向服装设计学生、新人设计师和独立创作者的新人设计挑战赛。",
      requirements: "上传 3-9 张作品图，填写 100-300 字设计理念，并确认原创或已获授权。",
      rewards: "Top 1 获得打样孵化支持名额；Top 3 获得面料样卡包；Top 10 获得首页推荐与电子证书。",
      startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21),
      status: ChallengeStatus.ACTIVE
    }
  });

  await prisma.systemSetting.createMany({
    data: [
      {
        key: "incubation_candidate_threshold",
        value: "30",
        description: "推荐孵化达到该次数后进入孵化候选"
      },
      {
        key: "incubation_editor_review_threshold",
        value: "100",
        description: "推荐孵化达到该次数后进入编辑评估"
      },
      {
        key: "homepage_featured_limit",
        value: "12",
        description: "首页精选作品展示数量"
      },
      {
        key: "homepage_ranking_limit",
        value: "10",
        description: "首页榜单展示数量"
      },
      {
        key: "active_challenge_id",
        value: challenge.id,
        description: "当前默认挑战赛 ID"
      }
    ]
  });

  const works = [];
  for (let index = 0; index < 30; index += 1) {
    const author = designers[index % designers.length];
    const reviewStatus =
      index < 24 ? ReviewStatus.APPROVED : index < 27 ? ReviewStatus.PENDING : index < 29 ? ReviewStatus.REJECTED : ReviewStatus.OFFLINE;

    const work = await prisma.work.create({
      data: {
        userId: author.id,
        title: workTitle(index),
        description: "这组作品从真实穿着场景出发，尝试用廓形、材料肌理和局部结构表达新人设计师的个人语言。",
        category: categories[index % categories.length],
        workType: workTypes[index % workTypes.length],
        styleTags: takeTags(index),
        reviewStatus,
        rejectReason: reviewStatus === ReviewStatus.REJECTED ? "图片数量不足或设计理念描述不完整，请补充后重新提交。" : null,
        contentStatus: reviewStatus === ReviewStatus.OFFLINE ? ContentStatus.OFFLINE : ContentStatus.VISIBLE,
        isOriginal: true,
        isAiAssisted: index % 5 === 0,
        isFeatured: index < 8,
        isEditorPick: index % 7 === 0,
        isOpenCoop: index % 3 !== 0,
        wantsFabric: index % 2 === 0,
        wantsSample: index % 4 === 0,
        wantsIncubation: index % 3 === 0,
        incubationStatus: index < 5 ? IncubationStatus.CANDIDATE : null,
        viewCount: 180 + index * 17,
        shareCount: index % 6,
        images: {
          create: Array.from({ length: 3 + (index % 3) }, (_, imageIndex) => ({
            imageUrl: `/uploads/seed/work-${String(index + 1).padStart(2, "0")}-${imageIndex + 1}.webp`,
            sortOrder: imageIndex
          }))
        }
      }
    });

    works.push(work);
  }

  const approvedWorks = works.filter((work) => work.reviewStatus === ReviewStatus.APPROVED);

  await Promise.all(
    approvedWorks.slice(0, 10).map((work, index) =>
      prisma.challengeEntry.create({
        data: {
          challengeId: challenge.id,
          workId: work.id,
          userId: work.userId,
          popularityScore: 80 - index * 3,
          incubationScore: 40 + index * 4,
          adminWeight: index < 3 ? 10 - index : 0,
          manualRank: index < 3 ? index + 1 : null,
          awardLevel: index === 0 ? "Top 1" : index < 3 ? "Top 3" : index < 10 ? "Top 10" : null
        }
      })
    )
  );

  for (const [workIndex, work] of approvedWorks.entries()) {
    const likeUsers = designers.filter((_, userIndex) => (userIndex + workIndex) % 2 === 0);
    const favoriteUsers = designers.filter((_, userIndex) => (userIndex + workIndex) % 3 === 0);
    const recommendationUsers = designers.filter((_, userIndex) => (userIndex + workIndex) % 4 === 0);
    const commentUsers = designers.filter((_, userIndex) => (userIndex + workIndex) % 5 === 0).slice(0, 3);

    await prisma.like.createMany({
      data: likeUsers.map((user) => ({ userId: user.id, workId: work.id })),
      skipDuplicates: true
    });

    await prisma.favorite.createMany({
      data: favoriteUsers.map((user) => ({ userId: user.id, workId: work.id })),
      skipDuplicates: true
    });

    await prisma.incubationRecommendation.createMany({
      data: recommendationUsers.map((user) => ({ userId: user.id, workId: work.id })),
      skipDuplicates: true
    });

    await prisma.comment.createMany({
      data: commentUsers.map((user, index) => ({
        userId: user.id,
        workId: work.id,
        content: index === 0 ? "廓形很完整，适合继续推进面料和版型评估。" : "色彩方向很明确，期待看到真实样衣。"
      }))
    });

    await prisma.work.update({
      where: { id: work.id },
      data: {
        likeCount: likeUsers.length,
        favoriteCount: favoriteUsers.length,
        commentCount: commentUsers.length,
        incubationRecommendCount: recommendationUsers.length
      }
    });
  }

  const incubationWorks = approvedWorks.slice(0, 5);
  await Promise.all(
    incubationWorks.map((work, index) =>
      prisma.incubationApplication.create({
        data: {
          userId: work.userId,
          workId: work.id,
          source: index < 2 ? IncubationSource.EDITOR_PICK : IncubationSource.ADMIN,
          status: index === 0 ? IncubationApplicationStatus.REVIEWING : IncubationApplicationStatus.CANDIDATE,
          adminNote: "种子数据：适合进入孵化候选池。"
        }
      })
    )
  );

  await Promise.all(
    incubationWorks.map((work, index) =>
      prisma.incubationProject.create({
        data: {
          workId: work.id,
          designerId: work.userId,
          status: index === 0 ? IncubationStatus.FABRIC_MATCHING : IncubationStatus.CANDIDATE,
          platformComment: index % 2 === 0 ? "廓形完整，适合进行面料与版型评估。" : "色彩方向明确，适合开发春夏系列。",
          nextAction: index === 0 ? "进行面料方向初筛" : "等待编辑评估"
        }
      })
    )
  );

  await prisma.fabricRequest.createMany({
    data: approvedWorks.slice(0, 6).map((work, index) => ({
      userId: work.userId,
      workId: work.id,
      category: work.category,
      desiredFeeling: [feelings[index % feelings.length], feelings[(index + 3) % feelings.length]],
      colorDirection: index % 2 === 0 ? "低饱和灰白" : "海盐蓝与银灰",
      budgetRange: index % 2 === 0 ? "100-300 元/米" : "300-600 元/米",
      contact: `designer${(index % designers.length) + 1}@runwaylab.test`,
      remark: "希望平台协助判断适合的面料方向。",
      status: index < 2 ? RequestStatus.CONTACTED : RequestStatus.PENDING
    }))
  });

  await prisma.sampleRequest.createMany({
    data: approvedWorks.slice(6, 11).map((work, index) => ({
      userId: work.userId,
      workId: work.id,
      garmentCategory: work.category,
      hasPattern: index % 2 === 0,
      hasFabric: false,
      needsFabricHelp: true,
      budgetRange: index % 2 === 0 ? "1000-3000 元" : "3000-8000 元",
      quantity: 1 + index,
      expectedDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate() + index * 3),
      contact: `designer${((index + 5) % designers.length) + 1}@runwaylab.test`,
      remark: "希望先评估纸样和打样可行性。",
      status: index === 0 ? RequestStatus.EVALUATED : RequestStatus.PENDING
    }))
  });

  await prisma.cooperationRequest.createMany({
    data: approvedWorks.slice(11, 16).map((work, index) => ({
      userId: work.userId,
      workId: work.id,
      type: [CooperationType.OPEN_COOP, CooperationType.COPYRIGHT, CooperationType.BRAND_COLLAB, CooperationType.SAMPLE_INCUBATION, CooperationType.INTERNSHIP][index],
      contact: `designer${((index + 2) % designers.length) + 1}@runwaylab.test`,
      message: "开放进一步沟通，希望了解合作形式和授权范围。",
      budgetRange: index % 2 === 0 ? "可商议" : "5000-10000 元",
      status: RequestStatus.PENDING
    }))
  });

  await prisma.report.createMany({
    data: [
      {
        reporterId: designers[0].id,
        targetType: ReportTargetType.WORK,
        targetId: approvedWorks[12].id,
        reason: ReportReason.AI_UNLABELED,
        description: "疑似 AI 辅助但未标注。",
        status: ReportStatus.PENDING
      },
      {
        reporterId: designers[1].id,
        targetType: ReportTargetType.WORK,
        targetId: approvedWorks[13].id,
        reason: ReportReason.STOLEN_IMAGE,
        description: "图片来源存疑。",
        status: ReportStatus.REJECTED,
        result: "未发现明显违规证据。",
        handledById: admin.id,
        handledAt: now
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: designers[0].id,
        type: NotificationType.WORK_APPROVED,
        title: "作品审核通过",
        content: "你的作品已进入作品库展示。",
        linkUrl: `/works/${approvedWorks[0].id}`
      },
      {
        userId: designers[1].id,
        type: NotificationType.INCUBATION_CANDIDATE,
        title: "作品进入孵化候选",
        content: "你的作品已被加入孵化候选池。",
        linkUrl: "/incubation"
      }
    ]
  });

  await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: "SEED_DATABASE",
      targetType: "SYSTEM",
      targetId: "seed",
      detail: {
        users: designers.length + 1,
        works: works.length,
        challengeId: challenge.id
      }
    }
  });

  console.log("Seed completed");
  console.log("Admin: admin@runwaylab.test / RunwayLab123!");
  console.log("Designers: designer1@runwaylab.test ... designer10@runwaylab.test / RunwayLab123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
