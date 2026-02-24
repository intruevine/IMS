#!/bin/bash

# Intruevine IMS ?먭꺽 諛고룷 ?ㅽ겕由쏀듃
# ?ъ슜踰? ./deploy_remote.sh

# ?쒕쾭 ?뺣낫
SERVER="intruevine.dscloud.biz"
USER="boazkim"
PASSWORD="R@kaf_427"
REMOTE_DIR="/web_packages/MA"
LOCAL_DIST="./dist"

echo "=========================================="
echo "Intruevine IMS ?먭꺽 諛고룷"
echo "=========================================="
echo "?쒕쾭: $SERVER"
echo "寃쎈줈: $REMOTE_DIR"
echo ""

# 鍮뚮뱶 ?뺤씤
if [ ! -d "$LOCAL_DIST" ] || [ ! -f "$LOCAL_DIST/index.html" ]; then
    echo "[?ㅻ쪟] dist ?대뜑媛 ?놁뒿?덈떎."
    echo "npm run build瑜?癒쇱? ?ㅽ뻾?섏꽭??"
    exit 1
fi

# sshpass ?ㅼ튂 ?뺤씤
if ! command -v sshpass &> /dev/null; then
    echo "[?ㅼ튂] sshpass媛 ?꾩슂?⑸땲??.."
    # Windows (Git Bash)
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "Git Bash?먯꽌???섎룞 ?ㅼ튂 ?꾩슂:"
        echo "https://github.com/akocero/sshpass-for-windows/releases"
        exit 1
    else
        # Linux/Mac
        sudo apt-get install -y sshpass || brew install sshpass
    fi
fi

echo "[1/3] ?쒕쾭 ?곌껐 ?뚯뒪??.."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "echo '?곌껐 ?깃났'" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[?ㅻ쪟] ?쒕쾭 ?곌껐 ?ㅽ뙣"
    echo "- ?ъ슜?먮챸/鍮꾨?踰덊샇 ?뺤씤"
    echo "- ?쒕쾭 二쇱냼 ?뺤씤"
    exit 1
fi
echo "[?꾨즺] ?쒕쾭 ?곌껐 ?깃났"
echo ""

echo "[2/3] 湲곗〈 ?뚯씪 諛깆뾽..."
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "
    if [ -d '$REMOTE_DIR' ] && [ \"\$(ls -A $REMOTE_DIR)\" ]; then
        cp -r $REMOTE_DIR ${REMOTE_DIR}_backup_$BACKUP_DATE
        echo '諛깆뾽 ?꾨즺: ${REMOTE_DIR}_backup_$BACKUP_DATE'
    else
        echo '諛깆뾽 ?놁쓬 (湲곗〈 ?뚯씪 ?놁쓬)'
    fi
"
echo ""

echo "[3/3] ?뚯씪 ?낅줈??以?.. (?쒓컙???뚯슂?????덉뒿?덈떎)"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no -r "$LOCAL_DIST"/* "$USER@$SERVER:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "[?깃났] 諛고룷媛 ?꾨즺?섏뿀?듬땲??"
    echo "=========================================="
    echo ""
    echo "?ъ씠??URL: https://intruevine.dscloud.biz"
    echo "諛고룷 寃쎈줈: $REMOTE_DIR"
    echo ""
    echo "釉뚮씪?곗??먯꽌 ?뺤씤?섏꽭??"
    echo ""
else
    echo ""
    echo "[?ㅻ쪟] ?낅줈???ㅽ뙣"
    echo "- ?ㅽ듃?뚰겕 ?곌껐 ?뺤씤"
    echo "- ?쒕쾭 ?붿뒪??怨듦컙 ?뺤씤"
    echo "- ?뚯씪 沅뚰븳 ?뺤씤"
    exit 1
fi

