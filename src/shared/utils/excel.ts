import type { AssetItem, Contract } from '@/types';
import { downloadCsv, readCsvFile } from './csv';

const CONTRACT_CSV_HEADERS = [
  'contract_id',
  'customer_name',
  'project_title',
  'project_type',
  'start_date',
  'end_date',
  'notes',
  'asset_id',
  'asset_category',
  'asset_item',
  'asset_product',
  'asset_qty',
  'asset_cycle',
  'asset_scope',
  'asset_company',
  'asset_remark',
  'engineer_name',
  'engineer_phone',
  'engineer_email'
] as const;

type ContractCsvHeader = (typeof CONTRACT_CSV_HEADERS)[number];

function today() {
  return new Date().toISOString().split('T')[0];
}

function normalizeProjectType(value: string) {
  return value === 'construction' ? 'construction' : 'maintenance';
}

function normalizeAssetCategory(value: string): AssetItem['category'] {
  return value === 'SW' ? 'SW' : 'HW';
}

function normalizeAssetCycle(value: string): AssetItem['cycle'] {
  if (value === '분기' || value === '반기' || value === '연' || value === '장애시') return value;
  return '월';
}

export const exportToExcel = async (contracts: Contract[], filename?: string) => {
  const rows: unknown[][] = [[...CONTRACT_CSV_HEADERS]];

  contracts.forEach((contract) => {
    if (contract.items.length === 0) {
      rows.push([
        contract.id,
        contract.customer_name,
        contract.project_title,
        contract.project_type,
        contract.start_date,
        contract.end_date,
        contract.notes || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
      return;
    }

    contract.items.forEach((asset) => {
      rows.push([
        contract.id,
        contract.customer_name,
        contract.project_title,
        contract.project_type,
        contract.start_date,
        contract.end_date,
        contract.notes || '',
        asset.id,
        asset.category,
        asset.item,
        asset.product,
        asset.qty,
        asset.cycle,
        asset.scope || '',
        asset.company || '',
        asset.remark || '',
        asset.engineer?.main?.name || '',
        asset.engineer?.main?.phone || '',
        asset.engineer?.main?.email || ''
      ]);
    });
  });

  downloadCsv(filename || `IMS_contracts_assets_${today()}.csv`, rows);
};

export const importFromExcel = async (file: File): Promise<Contract[]> => {
  const rows = await readCsvFile(file);
  if (rows.length <= 1) {
    throw new Error('CSV 파일에 데이터가 없습니다.');
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeader = headerRow.map((header) => header.trim());
  const headerIndex = new Map<string, number>();
  normalizedHeader.forEach((header, index) => {
    headerIndex.set(header, index);
  });

  const missingHeaders = CONTRACT_CSV_HEADERS.filter((header) => !headerIndex.has(header));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV 헤더가 올바르지 않습니다: ${missingHeaders.join(', ')}`);
  }

  const contracts = new Map<number, Contract>();

  dataRows.forEach((row, rowIndex) => {
    const getValue = (header: ContractCsvHeader) => row[headerIndex.get(header) ?? -1] || '';
    const contractId = Number(getValue('contract_id') || rowIndex + 1);
    const existing = contracts.get(contractId);

    const baseContract =
      existing ||
      ({
        id: contractId,
        customer_name: getValue('customer_name'),
        project_title: getValue('project_title'),
        project_type: normalizeProjectType(getValue('project_type')),
        start_date: getValue('start_date') || today(),
        end_date: getValue('end_date') || today(),
        notes: getValue('notes'),
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } satisfies Contract);

    const assetIdRaw = getValue('asset_id');
    if (assetIdRaw) {
      baseContract.items.push({
        id: Number(assetIdRaw),
        category: normalizeAssetCategory(getValue('asset_category')),
        item: getValue('asset_item'),
        product: getValue('asset_product'),
        details: [],
        qty: Number(getValue('asset_qty') || 1),
        cycle: normalizeAssetCycle(getValue('asset_cycle')),
        scope: getValue('asset_scope'),
        remark: getValue('asset_remark'),
        company: getValue('asset_company'),
        engineer: {
          main: {
            name: getValue('engineer_name'),
            phone: getValue('engineer_phone'),
            email: getValue('engineer_email')
          }
        }
      });
    }

    contracts.set(contractId, baseContract);
  });

  return Array.from(contracts.values());
};

export const downloadTemplate = async () => {
  downloadCsv('IMS_contracts_assets_template.csv', [
    [...CONTRACT_CSV_HEADERS],
    [
      1,
      '샘플 고객사',
      '2026 통합 유지보수',
      'maintenance',
      '2026-01-01',
      '2026-12-31',
      '샘플 계약',
      101,
      'HW',
      '방화벽',
      'AXGATE 1300S',
      2,
      '분기',
      '정기 점검 포함',
      '인투루바인',
      '샘플 자산',
      '홍길동',
      '010-1234-5678',
      'sample@example.com'
    ]
  ]);
};
