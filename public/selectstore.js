import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseauth.js";

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const selectStoreDOM = document.getElementById('selectStore');

selectStoreDOM.addEventListener('change', async (event) => {
    // ユーザーの認証状態を監視
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const uid = user.uid;    // ユーザID
            const conveni = event.target.value; // 表示店舗名
            try {
                // サーバーに現在のコンビニを送信してユーザーテーブルを更新
                const response = await axios.patch("/api/v1/update", { uid, conveni });
                console.log('/api/v1/update',response.data); // レスポンスをコンソールに表示
                location.reload()
            } catch (error) {
                console.error(error); // エラー発生時に表示
            }
        } else {
            console.log("ユーザーがログインしていません");
        }
    });
});
