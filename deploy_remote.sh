#!/bin/bash

# Intruevine IMS 원격 배포 스크립트
# 사용법: ./deploy_remote.sh

# 서버 정보
SERVER="intruvine.dscloud.biz"
USER="boazkim"
PASSWORD="R@kaf_427"
REMOTE_DIR="/web_packages/MA"
LOCAL_DIST="./dist"

echo "=========================================="
echo "Intruevine IMS 원격 배포"
echo "=========================================="
echo "서버: $SERVER"
echo "경로: $REMOTE_DIR"
echo ""

# 빌드 확인
if [ ! -d "$LOCAL_DIST" ] || [ ! -f "$LOCAL_DIST/index.html" ]; then
    echo "[오류] dist 폴더가 없습니다."
    echo "npm run build를 먼저 실행하세요."
    exit 1
fi

# sshpass 설치 확인
if ! command -v sshpass &> /dev/null; then
    echo "[설치] sshpass가 필요합니다..."
    # Windows (Git Bash)
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "Git Bash에서는 수동 설치 필요:"
        echo "https://github.com/akocero/sshpass-for-windows/releases"
        exit 1
    else
        # Linux/Mac
        sudo apt-get install -y sshpass || brew install sshpass
    fi
fi

echo "[1/3] 서버 연결 테스트..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "echo '연결 성공'" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[오류] 서버 연결 실패"
    echo "- 사용자명/비밀번호 확인"
    echo "- 서버 주소 확인"
    exit 1
fi
echo "[완료] 서버 연결 성공"
echo ""

echo "[2/3] 기존 파일 백업..."
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "
    if [ -d '$REMOTE_DIR' ] && [ \"\$(ls -A $REMOTE_DIR)\" ]; then
        cp -r $REMOTE_DIR ${REMOTE_DIR}_backup_$BACKUP_DATE
        echo '백업 완료: ${REMOTE_DIR}_backup_$BACKUP_DATE'
    else
        echo '백업 없음 (기존 파일 없음)'
    fi
"
echo ""

echo "[3/3] 파일 업로드 중... (시간이 소요될 수 있습니다)"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no -r "$LOCAL_DIST"/* "$USER@$SERVER:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "[성공] 배포가 완료되었습니다!"
    echo "=========================================="
    echo ""
    echo "사이트 URL: https://intruvine.dscloud.biz"
    echo "배포 경로: $REMOTE_DIR"
    echo ""
    echo "브라우저에서 확인하세요."
    echo ""
else
    echo ""
    echo "[오류] 업로드 실패"
    echo "- 네트워크 연결 확인"
    echo "- 서버 디스크 공간 확인"
    echo "- 파일 권한 확인"
    exit 1
fi
