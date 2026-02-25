3# Intruevine IMS 諛고룷 媛?대뱶

## 諛고룷 ?뺣낫
- **?ъ씠??URL**: https://intruevine.dscloud.biz
- **諛고룷 ?붾젆?좊━**: `/web_packages/MA` (?먮뒗 `C:\web_packages\MA`)
- **鍮뚮뱶 ?대뜑**: `dist/`

## 諛고룷 諛⑸쾿

### 諛⑸쾿 1: 濡쒖뺄 諛고룷 ?ㅽ겕由쏀듃 ?ъ슜 (Windows)

1. 諛고룷 ?ㅽ겕由쏀듃 ?ㅽ뻾:
```batch
deploy.bat
```

2. ?ㅽ겕由쏀듃媛 ?먮룞?쇰줈:
   - 湲곗〈 ?뚯씪 諛깆뾽 ?앹꽦
   - `dist/` ?대뜑 ?댁슜??諛고룷 ?붾젆?좊━濡?蹂듭궗
   - ?꾨즺 硫붿떆吏 ?쒖떆

### 諛⑸쾿 2: ?섎룞 諛고룷

1. **鍮뚮뱶** (?대? ?꾨즺??:
```bash
npm run build
```

2. **dist ?대뜑 ?댁슜??諛고룷 ?붾젆?좊━濡?蹂듭궗**:
   - Windows ?먯깋湲곗뿉??`dist/` ?대뜑 ?댁슜 ?좏깮
   - `C:\web_packages\MA` (?먮뒗 吏?뺣맂 寃쎈줈)濡?蹂듭궗
   - 湲곗〈 ?뚯씪 ??뼱?곌린

### 諛⑸쾿 3: SSH/FTP 諛고룷 (?먭꺽 ?쒕쾭)

#### SSH (Linux/Mac)
```bash
# 1. 鍮뚮뱶
npm run build

# 2. SSH濡??쒕쾭 ?묒냽 ???뚯씪 蹂듭궗
scp -r dist/* boazkim@intruevine.dscloud.biz:/web_packages/MA/
```

#### FTP/SFTP
```bash
# FileZilla ?먮뒗 WinSCP ?ъ슜
# ?몄뒪?? intruevine.dscloud.biz
# ?ъ슜?? boazkim
# 鍮꾨?踰덊샇: R@kaf_427
# 濡쒖뺄: dist/
# ?먭꺽: /web_packages/MA
```

## 諛고룷???뚯씪 援ъ“

```
/web_packages/MA/
?쒋?? index.html              # 硫붿씤 ?섏씠吏
?쒋?? assets/
??  ?쒋?? index-*.js         # JavaScript 踰덈뱾
??  ?붴?? index-*.css        # CSS ?ㅽ????쒋?? manifest.webmanifest    # PWA 留ㅻ땲?섏뒪???쒋?? registerSW.js          # ?쒕퉬???뚯빱 ?깅줉
?쒋?? sw.js                  # ?쒕퉬???뚯빱
?붴?? workbox-*.js           # Workbox ?쇱씠釉뚮윭由?```

## 諛고룷 ???뺤씤?ы빆

1. **?뱀궗?댄듃 ?묒냽**: https://intruevine.dscloud.biz
2. **濡쒓렇???뚯뒪??*:
   - 愿由ъ옄: admin / admin
   - ?ъ슜?? user / user
3. **PWA 湲곕뒫 ?뺤씤** (紐⑤컮???곗뒪?ы깙)
4. **罹먯떆 ??젣** (Ctrl+F5 ?먮뒗 Cmd+Shift+R)

## 臾몄젣 ?닿껐

### ?섏씠吏媛 濡쒕뱶?섏? ?딆쓣 ??- 釉뚮씪?곗? 罹먯떆 ??젣 (Ctrl+Shift+Delete)
- ?쒕쾭 濡쒓렇 ?뺤씤
- ?뚯씪 沅뚰븳 ?뺤씤 (755 ?먮뒗 644)

### 404 ?ㅻ쪟
- index.html ?뚯씪 ?뺤씤
- .htaccess ?뚯씪 (Apache) ?먮뒗 nginx ?ㅼ젙 ?뺤씤
- 寃쎈줈 ??뚮Ц???뺤씤

### ?ㅽ????ㅽ겕由쏀듃 濡쒕뱶 ?ㅻ쪟
- 媛쒕컻???꾧뎄 (F12) ??Network ???뺤씤
- assets/ ?대뜑媛 ?щ컮瑜닿쾶 蹂듭궗?섏뿀?붿? ?뺤씤
- MIME ????ㅼ젙 ?뺤씤

## ?쒕쾭 ?ㅼ젙 (Apache .htaccess)

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

## ?쒕쾭 ?ㅼ젙 (Nginx)

```nginx
server {
    listen 80;
    server_name intruevine.dscloud.biz;
    root /web_packages/MA;
    index index.html;

    # Backend API reverse proxy (Express: 127.0.0.1:3001)
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Ensure /MA path is served by SPA entrypoint
    location /MA/ {
        try_files $uri $uri/ /MA/index.html;
    }

    location = /MA {
        return 301 /MA/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## ?곕씫泥?- 媛쒕컻?? Intruevine Team
- 踰꾩쟾: v2.0.0
- 鍮뚮뱶 ?좎쭨: 2025.02.23

