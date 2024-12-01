const { text } = require('body-parser');
const express = require('express');
const path = require('path');
//  webスクレイピング用モジュールをインスタンス化
const puppeteer = require('puppeteer')
const app = express();
const PORT = process.env.PORT || 5000;

require('dotenv').config();
//  login.htmlに遷移
app.get('/',(req,res)=>{
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sample FirebaseUI App</title>
    <!-- Firebase JavaScript SDK -->
    <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.js"></script>
    <link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.css" />
    <script type="text/javascript">
        // Firebase 設定
        const firebaseConfig = {
            apiKey:"${process.env.APIKEY}",
            authDomain: "${process.env.AUTHDOMAIN}",
            projectId: "${process.env.PROJECTID}",
            storageBucket: "${process.env.STORAGEBUCKET}",
            messagingSenderId: "${process.env.STORAGEBUCKET}",
            appId: "${process.env.APPID}",
            measurementId: "${process.env.measurementId}"
        };

        // Firebase を初期化
        firebase.initializeApp(firebaseConfig);

        // FirebaseUI の設定
        var uiConfig = {
            // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
            signInFlow: 'popup',
            signInSuccessUrl: './index.html',
            signInOptions: [{
                // 使用する認証プロバイダを指定
                provider:firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                //　ボタンカラーを指定(デフォルトは白)
                buttonColor:'#2F2F2F',
            } 
            ],
        };
        // FirebaseUI ウィジェットを初期化
        var ui;
        document.addEventListener("DOMContentLoaded", function () {
            ui = new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
        });
    </script>
</head>
<body>
    <div id="firebaseui-auth-container"></div>
    <!-- <div id="loader">Loading...</div> -->
</body>
</html>`);
})
app.use(express.static('public'));
// (async () => {
//     const browser = await puppeteer.launch({headless: true});
//     const page = await browser.newPage();
//     //  ローソンの新商品ページに遷移
//     await page.goto('https://www.lawson.co.jp/recommend/new/list/1494855_5162.html');
//     await browser.close();
// })();



app.listen(PORT,()=>{console.log(`http://localhost:${PORT}`)})