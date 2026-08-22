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
assert.match(home, /从想法到第一件产品/);

const startFlow = source("src/components/start/StartProjectFlow.tsx");
const sourceOptions = startFlow.slice(startFlow.indexOf("const sourceOptions"), startFlow.indexOf("const categoryOptions"));
assert.match(sourceOptions, /选择已有作品/);
assert.match(sourceOptions, /创建产品想法/);
assert.doesNotMatch(sourceOptions, /AUDIENCE|STORE|BRAND/);
assert.doesNotMatch(startFlow, /公开 uploads/);

const mobileNav = source("src/types/navigation.ts");
for (const label of ["首页", "发现", "发布作品", "项目", "我的"]) assert.match(mobileNav, new RegExp(`label: "${label}"`));
assert.doesNotMatch(mobileNav, /label: "面料"/);

const desktopNav = source("src/components/layout/AuthNav.tsx");
assert.match(desktopNav, /providerMode\s*\?[\s\S]*业务机会/);
assert.doesNotMatch(desktopNav.slice(desktopNav.indexOf("function navItems"), desktopNav.indexOf("export function AuthNav")), /label: "平台"|label: "面料"/);

const platform = source("src/app/platform/page.tsx");
assert.match(platform, /让好设计/);
assert.match(platform, /一条路径，逐步向前/);
assert.doesNotMatch(platform, /基础可用|继续补齐|后续版本|V2\.0B|PLATFORM_AVAILABILITY/);

const challenges = source("src/app/challenges/page.tsx");
assert.match(challenges, /firstMatchingIndex/);
assert.match(challenges, /已结束/);
assert.doesNotMatch(challenges, /\{challenge\.status\}/);

console.log("product maturity foundation tests: PASS");
