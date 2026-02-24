3# Intruevine IMS 배포 가이드

## 배포 정보
- **사이트 URL**: https://intruvine.dscloud.biz
- **배포 디렉토리**: `/web_packages/MA` (또는 `C:\web_packages\MA`)
- **빌드 폴더**: `dist/`

## 배포 방법

### 방법 1: 로컬 배포 스크립트 사용 (Windows)

1. 배포 스크립트 실행:
```batch
deploy.bat
```

2. 스크립트가 자동으로:
   - 기존 파일 백업 생성
   - `dist/` 폴더 내용을 배포 디렉토리로 복사
   - 완료 메시지 표시

### 방법 2: 수동 배포

1. **빌드** (이미 완료됨):
```bash
npm run build
```

2. **dist 폴더 내용을 배포 디렉토리로 복사**:
   - Windows 탐색기에서 `dist/` 폴더 내용 선택
   - `C:\web_packages\MA` (또는 지정된 경로)로 복사
   - 기존 파일 덮어쓰기

### 방법 3: SSH/FTP 배포 (원격 서버)

#### SSH (Linux/Mac)
```bash
# 1. 빌드
npm run build

# 2. SSH로 서버 접속 후 파일 복사
scp -r dist/* boazkim@intruvine.dscloud.biz:/web_packages/MA/
```

#### FTP/SFTP
```bash
# FileZilla 또는 WinSCP 사용
# 호스트: intruevine.dscloud.biz
# 사용자: boazkim
# 비밀번호: R@kaf_427
# 로컬: dist/
# 원격: /web_packages/MA
```

## 배포된 파일 구조

```
/web_packages/MA/
├── index.html              # 메인 페이지
├── assets/
│   ├── index-*.js         # JavaScript 번들
│   └── index-*.css        # CSS 스타일
├── manifest.webmanifest    # PWA 매니페스트
├── registerSW.js          # 서비스 워커 등록
├── sw.js                  # 서비스 워커
└── workbox-*.js           # Workbox 라이브러리
```

## 배포 후 확인사항

1. **웹사이트 접속**: https://intruvine.dscloud.biz
2. **로그인 테스트**:
   - 관리자: admin / admin
   - 사용자: user / user
3. **PWA 기능 확인** (모바일/데스크탑)
4. **캐시 삭제** (Ctrl+F5 또는 Cmd+Shift+R)

## 문제 해결

### 페이지가 로드되지 않을 때
- 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
- 서버 로그 확인
- 파일 권한 확인 (755 또는 644)

### 404 오류
- index.html 파일 확인
- .htaccess 파일 (Apache) 또는 nginx 설정 확인
- 경로 대소문자 확인

### 스타일/스크립트 로드 오류
- 개발자 도구 (F12) → Network 탭 확인
- assets/ 폴더가 올바르게 복사되었는지 확인
- MIME 타입 설정 확인

## 서버 설정 (Apache .htaccess)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(js|css)$">
    Header set Cache-Control "max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
```

## 서버 설정 (Nginx)

```nginx
server {
    listen 80;
    server_name intruvine.dscloud.biz;
    root /web_packages/MA;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 연락처
- 개발자: Intruevine Team
- 버전: v2.0.0
- 빌드 날짜: 2025.02.23
