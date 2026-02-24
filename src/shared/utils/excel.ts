import * as XLSX from 'xlsx';
import type { Contract, AssetItem } from '@/types';

/**
 * 계약 및 자산 데이터를 Excel 파일로보내기
 */
export const exportToExcel = (contracts: Contract[], filename?: string) => {
  // 계약 시트 데이터
  const contractData = contracts.map(contract => ({
    'ID': contract.id,
    '고객사명': contract.customer_name,
    '프로젝트명': contract.project_title,
    '시작일': contract.start_date,
    '종료일': contract.end_date,
    '비고': contract.notes || '',
    '자산수': contract.items.length,
    '생성일': contract.created_at || '',
    '수정일': contract.updated_at || ''
  }));

  // 자산 시트 데이터
  const assetData: (AssetItem & { contract_id: number; customer_name: string; project_title: string })[] = [];
  contracts.forEach(contract => {
    contract.items.forEach(asset => {
      assetData.push({
        ...asset,
        contract_id: contract.id,
        customer_name: contract.customer_name,
        project_title: contract.project_title
      });
    });
  });

  const assetSheetData = assetData.map(asset => ({
    '계약ID': asset.contract_id,
    '고객사': asset.customer_name,
    '프로젝트': asset.project_title,
    '자산ID': asset.id,
    '카테고리': asset.category,
    '품목': asset.item,
    '모델': asset.product,
    '수량': asset.qty,
    '점검주기': asset.cycle,
    '유지보수범위': asset.scope || '',
    '업체명': asset.company || '',
    '비고': asset.remark || '',
    '주담당자': asset.engineer?.main?.name || '',
    '주담당자연락처': asset.engineer?.main?.phone || '',
    '주담당자이메일': asset.engineer?.main?.email || ''
  }));

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 계약 시트 추가
  const contractWs = XLSX.utils.json_to_sheet(contractData);
  XLSX.utils.book_append_sheet(wb, contractWs, '계약 목록');
  
  // 자산 시트 추가
  const assetWs = XLSX.utils.json_to_sheet(assetSheetData);
  XLSX.utils.book_append_sheet(wb, assetWs, '자산 목록');

  // 파일 저장
  const defaultFilename = `IMS_계약_자산_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
};

/**
 * Excel 파일에서 계약 및 자산 데이터 가져오기
 */
export const importFromExcel = async (file: File): Promise<Contract[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // 계약 시트 읽기
        const contractSheetName = workbook.SheetNames[0];
        const contractSheet = workbook.Sheets[contractSheetName];
        const contractJson = XLSX.utils.sheet_to_json(contractSheet);
        
        // 자산 시트 읽기
        const assetSheetName = workbook.SheetNames[1] || '자산 목록';
        const assetSheet = workbook.Sheets[assetSheetName];
        const assetJson = XLSX.utils.sheet_to_json(assetSheet);

        // 계약 데이터 변환
        const contracts: Contract[] = contractJson.map((row: any, index: number) => {
          const contractId = row['ID'] || index + 1;
          
          // 해당 계약의 자산 찾기
          const contractAssets = assetJson
            .filter((assetRow: any) => assetRow['계약ID'] === contractId)
            .map((assetRow: any, assetIndex: number) => ({
              id: assetRow['자산ID'] || Date.now() + assetIndex,
              category: assetRow['카테고리'] || 'HW',
              item: assetRow['품목'] || '',
              product: assetRow['모델'] || '',
              details: [],
              qty: assetRow['수량'] || 1,
              cycle: assetRow['점검주기'] || '월',
              scope: assetRow['유지보수범위'] || '',
              remark: assetRow['비고'] || '',
              company: assetRow['업체명'] || '',
              engineer: {
                main: {
                  name: assetRow['주담당자'] || '',
                  phone: assetRow['주담당자연락처'] || '',
                  email: assetRow['주담당자이메일'] || ''
                }
              }
            } as AssetItem));

          return {
            id: contractId,
            customer_name: row['고객사명'] || '',
            project_title: row['프로젝트명'] || '',
            start_date: row['시작일'] || new Date().toISOString().split('T')[0],
            end_date: row['종료일'] || new Date().toISOString().split('T')[0],
            notes: row['비고'] || '',
            items: contractAssets,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Contract;
        });

        resolve(contracts);
      } catch (error) {
        reject(new Error('Excel 파일을 파싱하는 중 오류가 발생했습니다'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Excel 템플릿 생성 (빈 양식)
 */
export const downloadTemplate = () => {
  // 샘플 데이터
  const sampleContract = [{
    'ID': 1,
    '고객사명': '한국전자',
    '프로젝트명': '2025년 통합보안 유지보수',
    '시작일': '2025-01-01',
    '종료일': '2025-12-31',
    '비고': '특이사항 없음',
    '자산수': 1,
    '생성일': '',
    '수정일': ''
  }];

  const sampleAsset = [{
    '계약ID': 1,
    '고객사': '한국전자',
    '프로젝트': '2025년 통합보안 유지보수',
    '자산ID': 101,
    '카테고리': 'HW',
    '품목': '방화벽',
    '모델': 'AXGATE 1300S',
    '수량': 2,
    '점검주기': '월',
    '유지보수범위': 'HW 무상 지원 포함',
    '업체명': '이테크시스템',
    '비고': '특이사항 없음',
    '주담당자': '이복한',
    '주담당자연락처': '010-9192-1348',
    '주담당자이메일': 'bhlee@physis.kr'
  }];

  const wb = XLSX.utils.book_new();
  
  const contractWs = XLSX.utils.json_to_sheet(sampleContract);
  XLSX.utils.book_append_sheet(wb, contractWs, '계약 목록');
  
  const assetWs = XLSX.utils.json_to_sheet(sampleAsset);
  XLSX.utils.book_append_sheet(wb, assetWs, '자산 목록');

  XLSX.writeFile(wb, 'IMS_계약_자산_템플릿.xlsx');
};
