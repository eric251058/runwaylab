import assert from "node:assert/strict";
import fs from "node:fs";

function source(path: string) {
  return fs.readFileSync(path, "utf8");
}

const publicRules = source("src/lib/supply-network.ts");
assert.match(publicRules, /ownerId:\s*\{\s*not:\s*null/);
assert.match(publicRules, /owner:\s*\{\s*is:\s*\{\s*status:\s*UserStatus\.ACTIVE/);
assert.match(publicRules, /export function publicFabricWhere/);
assert.match(publicRules, /provider:\s*\{\s*is:\s*publicProviderWhere\(\)/);

for (const path of ["src/app/fabrics/page.tsx", "src/app/fabrics/[id]/page.tsx"]) {
  assert.match(source(path), /publicFabricWhere\(\)/, `${path} must exclude products from unverified provider contexts`);
}

for (const path of ["src/app/cases/page.tsx", "src/app/cases/[id]/page.tsx"]) {
  assert.match(source(path), /publicProviderWhere\(\)/, `${path} must exclude cases from unverified provider contexts`);
}

const workDetail = source("src/app/works/[id]/page.tsx");
assert.match(workDetail, /fabric:\s*\{\s*is:\s*publicFabricWhere\(\)/);
assert.match(workDetail, /provider:\s*\{\s*is:\s*publicProviderWhere\(\)/);

const home = source("src/app/page.tsx");
assert.doesNotMatch(home, /两种开始方式/);
assert.doesNotMatch(home, /我有设计作品/);
assert.match(home, /启动服装项目/);
assert.match(home, /精选作品/);
assert.match(home, /\.slice\(0,\s*6\)/);
assert.match(home, /commentPreviews=\{\{\}\}/);
assert.doesNotMatch(home, /从想法到第一件产品|真实推进中的项目|面料与服务商/);

const startFlow = source("src/components/start/StartProjectFlow.tsx");
const sourceOptions = startFlow.slice(startFlow.indexOf("const sourceOptions"), startFlow.indexOf("const categoryOptions"));
assert.match(sourceOptions, /选择已有作品/);
assert.match(sourceOptions, /创建产品想法/);
assert.match(sourceOptions, /我想要一件衣服/);
assert.doesNotMatch(sourceOptions, /AUDIENCE|STORE|BRAND/);
assert.doesNotMatch(startFlow, /公开 uploads/);

const mobileNav = source("src/types/navigation.ts");
for (const label of ["首页", "发现", "发布作品", "项目", "我的"]) assert.match(mobileNav, new RegExp(`label: "${label}"`));
assert.doesNotMatch(mobileNav, /label: "面料"/);

const desktopNav = source("src/components/layout/AuthNav.tsx");
const desktopNavItems = desktopNav.slice(desktopNav.indexOf("function navItems"), desktopNav.indexOf("export function AuthNav"));
assert.match(desktopNav, /我的工作台/);
assert.doesNotMatch(desktopNavItems, /业务机会|providers\/opportunities|label: "平台"|label: "面料"/);

const platform = source("src/app/platform/page.tsx");
assert.match(platform, /让好设计/);
assert.match(platform, /一条路径，逐步向前/);
assert.doesNotMatch(platform, /基础可用|继续补齐|后续版本|V2\.0B|PLATFORM_AVAILABILITY/);

const challenges = source("src/app/challenges/page.tsx");
assert.match(challenges, /firstMatchingIndex/);
const challengeFilterEnd = challenges.indexOf("\n  });", challenges.indexOf("const visibleChallenges"));
const challengeRedirect = challenges.indexOf('if (!visibleChallenges.length) redirect("/works")');
assert.ok(challengeFilterEnd > -1 && challengeRedirect > challengeFilterEnd, "empty challenge redirect must run after filtering");

const presale = source("src/app/presale/page.tsx");
assert.match(presale, /if \(!campaigns\.length && !selectedLegacyWork\) redirect\("\/works"\)/);

const exhibitions = source("src/app/exhibitions/page.tsx");
assert.match(exhibitions, /if \(!visibleExhibitions\.length\) redirect\("\/works"\)/);

console.log("product maturity foundation tests: PASS");
