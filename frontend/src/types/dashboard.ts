export type MetricPoint = {
  year: number;
  value: number;
  change_percent: number;
};

export type DashboardMetrics = {
  import_data: MetricPoint[];
  production: MetricPoint[];
  consumption: MetricPoint[];
};

export type TariffInfo = {
  current: number;
  wto_obligation: number;
};

export type GeographyItem = {
  country: string;
  share_percent: number;
};

export type ContractPriceItem = {
  country: string;
  price_usd: number;
};

export type OrganizationInfo = {
  name: string;
  inn: string | null;
};

export type ProductInfo = {
  name: string;
  code: string;
};

export type DashboardData = {
  product: ProductInfo;
  organization: OrganizationInfo;
  tariffs: TariffInfo;
  metrics: DashboardMetrics;
  geography: GeographyItem[];
  prices: ContractPriceItem[];
  recommendations: string[];
  share_url: string;
};

export type DashboardResponse = {
  dashboard: DashboardData;
};

export type DashboardRequest = {
  product: ProductInfo;
  organization: OrganizationInfo;
};
