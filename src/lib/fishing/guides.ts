export type OfficialLink = {
  href: string
  label: string
  note: string
}

export type StateLinks = {
  state: string
  regulations: OfficialLink[]
  advisories: OfficialLink[]
  stocking: OfficialLink[]
}

export const FISHING_STATE_LINKS: StateLinks[] = [
  {
    state: 'New York',
    regulations: [
      {
        href: 'https://dec.ny.gov/things-to-do/freshwater-fishing/regulations',
        label: 'Freshwater fishing regulations',
        note: 'NY Department of Environmental Conservation',
      },
    ],
    advisories: [
      {
        href: 'https://www.health.ny.gov/environmental/outdoors/fish/health_advisories/',
        label: 'Fish consumption advisories',
        note: 'NY State Department of Health',
      },
    ],
    stocking: [
      {
        href: 'https://dec.ny.gov/things-to-do/freshwater-fishing/stocking',
        label: 'DEC stocking page',
        note: 'NY Department of Environmental Conservation',
      },
      {
        href: 'https://data.ny.gov/Recreation/Current-Season-Spring-Trout-Stocking/d9y2-n436',
        label: 'Current season spring trout stocking',
        note: 'Planned list on data.ny.gov. Not a record of fish already stocked.',
      },
      {
        href: 'https://data.ny.gov/Recreation/Fish-Stocking-Lists-Actual-Beginning-2011/e52k-ymww',
        label: 'Fish stocking lists (actual)',
        note: 'Historical summaries. The newest year lags the current season.',
      },
    ],
  },
  {
    state: 'Vermont',
    regulations: [
      {
        href: 'https://vtfishandwildlife.com/fish/fishing-regulations',
        label: 'Fishing regulations',
        note: 'Vermont Fish and Wildlife',
      },
    ],
    advisories: [
      {
        href: 'https://www.healthvermont.gov/environment/environmental-chemicals-pollutants/mercury-fish',
        label: 'Mercury in fish',
        note: 'Vermont Department of Health',
      },
    ],
    stocking: [
      {
        href: 'https://anrweb.vt.gov/FWD/FW/FishStockingSchedule.aspx',
        label: 'Stocking schedule',
        note: 'Vermont Fish and Wildlife. Not copied here.',
      },
      {
        href: 'https://anrweb.vt.gov/FWD/FW/FishStockingSearch.aspx',
        label: 'Stocking search',
        note: 'Vermont Fish and Wildlife. Not copied here.',
      },
    ],
  },
  {
    state: 'New Hampshire',
    regulations: [
      {
        href: 'https://www.wildlife.nh.gov/fishing-new-hampshire',
        label: 'Fishing in New Hampshire',
        note: 'NH Fish and Game',
      },
    ],
    advisories: [
      {
        href: 'https://www.wildlife.nh.gov/fishing-new-hampshire/consuming-freshwater-fish',
        label: 'Consuming freshwater fish',
        note: 'NH Fish and Game',
      },
      {
        href: 'https://www.des.nh.gov/home-and-recreation/boating-and-fishing/fish-consumption',
        label: 'Fish consumption',
        note: 'NH Department of Environmental Services',
      },
    ],
    stocking: [
      {
        href: 'https://www.wildlife.nh.gov/fishing-new-hampshire/stocking-report',
        label: 'Stocking report',
        note: 'NH Fish and Game. Not copied here.',
      },
    ],
  },
  {
    state: 'Maine',
    regulations: [
      {
        href: 'https://www.maine.gov/ifw/fishing-boating/fishing/laws-rules/index.html',
        label: 'Fishing laws and rules',
        note: 'Maine Department of Inland Fisheries and Wildlife',
      },
    ],
    advisories: [
      {
        href: 'https://www.maine.gov/ifw/fishing-boating/fishing/laws-rules/consumption-advisory.html',
        label: 'Freshwater fish safe eating guidelines',
        note: 'Maine Department of Inland Fisheries and Wildlife',
      },
    ],
    stocking: [
      {
        href: 'https://www.maine.gov/ifw/fishing-boating/fishing/fish-stocking-report.html',
        label: 'Fish stocking report',
        note: 'Maine Department of Inland Fisheries and Wildlife',
      },
      {
        href: 'https://www.maine.gov/ifw/docs/current_stocking_report.pdf',
        label: 'Current stocking report (PDF)',
        note: 'The same file this page reads for dates.',
      },
    ],
  },
]
