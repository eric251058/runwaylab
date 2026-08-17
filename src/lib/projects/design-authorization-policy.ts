export const PROJECT_DESIGN_AUTHORIZATION_TERMS_VERSION = "v2.3-standard-2026-08";

export const PROJECT_DESIGN_AUTHORIZATION_SCOPE =
  "允许项目方在 RunwayLab 内围绕本作品进行项目展示、样衣与商品准备、收集不付款的限量预售订单意向；具体商品、成团目标、本期限量、截止时间与预计发货时间以活动页面公示为准，作者可在成团前核对并撤销授权，撤销后系统将停止或暂停新增接单；当活动达到页面公示的成团目标且未取消时，项目方可以按已审核商品与本期公示限量组织一次有限生产。此授权不转让著作权，不允许超出本期限量、扩展到其他商品、进行平台外再授权或长期重复生产。";

export const PROJECT_DESIGN_AUTHORIZATION_ROYALTY_NOTICE =
  "RunwayLab 不参与双方的分成或结算。作者接受前应自行与项目方确认销售、分成、税费和交付责任；接受表示作者同意项目方在本期公示范围内按上述条件进行有限生产，但不代表平台对收益、生产质量或履约作出保证。";

export const PROJECT_COLLABORATION_AUTHORIZATION_TERMS_VERSION = "v2.2-standard-2026-08";

export const PROJECT_COLLABORATION_AUTHORIZATION_SCOPE =
  "允许项目方在 RunwayLab 内围绕本作品进行项目展示、合作沟通、样衣与商品方案准备。此授权不转让著作权，不包含限量预售接单、量产、平台外授权或长期重复生产；如项目后续进入 V2.3 限量预售，必须针对唯一一期活动重新发送标准邀请并由作者另行接受。";

export const PROJECT_COLLABORATION_AUTHORIZATION_ROYALTY_NOTICE =
  "RunwayLab 不参与双方的分成或结算。项目展示、打样、费用、知识产权使用及后续商业合作由双方自行确认，接受本邀请不代表平台对收益、生产质量或履约作出保证。";

export function projectDesignAuthorizationPolicy(preorderCampaignId: string | null) {
  return preorderCampaignId
    ? {
        termsVersion: PROJECT_DESIGN_AUTHORIZATION_TERMS_VERSION,
        scope: PROJECT_DESIGN_AUTHORIZATION_SCOPE,
        royaltyNotice: PROJECT_DESIGN_AUTHORIZATION_ROYALTY_NOTICE,
        preorderCampaignId,
        label: "V2.3 单期限量预售"
      }
    : {
        termsVersion: PROJECT_COLLABORATION_AUTHORIZATION_TERMS_VERSION,
        scope: PROJECT_COLLABORATION_AUTHORIZATION_SCOPE,
        royaltyNotice: PROJECT_COLLABORATION_AUTHORIZATION_ROYALTY_NOTICE,
        preorderCampaignId: null,
        label: "项目合作准备"
      };
}
