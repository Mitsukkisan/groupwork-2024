import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, setDoc, doc,updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase設定
export const firebaseConfig = {
    apiKey: "AIzaSyArHbubY097iRMuvY-Dq8SwSZRpw3mhaNg",
    authDomain: "conveni-trend.firebaseapp.com",
    projectId: "conveni-trend",
    storageBucket: "conveni-trend.firebasestorage.app",
    messagingSenderId: "968316614555",
    appId: "1:968316614555:web:a2efa219e0586ad665933e",
    measurementId: "G-6YY0LVQ8MZ"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth();

// サインアップ処理 (signup.html)
if (document.getElementById('submitSignup')) {
    const signUp = document.getElementById('submitSignup');
    signUp.addEventListener('click', (event) => {
        event.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const db = getFirestore();
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                const userData = {
                    email: email,
                    password: password,
                };
                window.alert("ユーザー登録に成功しました");
                const docRef = doc(db, "users", user.uid);
                setDoc(docRef, userData)
                    .then(() => {
                        window.location.href = './index.html';
                    });
            })
            .catch((err) => {
                const errorCode = err.code;
                if (errorCode === 'auth/email-already-in-use') {
                    window.alert("そのメールアドレスは既に登録されています");
                } else {
                    window.alert("ユーザー登録が出来ませんでした");
                }
            });
    });
}

// サインイン処理 (index.html)
if (document.getElementById('submitSignin')) {
    const signIn = document.getElementById('submitSignin');
    signIn.addEventListener('click', (event) => {
        event.preventDefault();
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                window.alert("ログインに成功しました");
                const user = userCredential.user;
                localStorage.setItem('loggedInUserId', user.uid);
                window.location.href = "./menu.html";
            })
            .catch((err) => {
                const errorCode = err.code;
                if (errorCode === 'auth/invalid-credential') {
                    window.alert('メールアドレスかパスワードが正しくありません');
                } else {
                    window.alert('アカウントが存在しません');
                }
            });
    });
}

//  セッション管理
if (document.getElementById('username')) {
    const usernameDOM = document.getElementById('username');
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const uid = user.displayName || "ゲスト";
            usernameDOM.innerHTML = uid;
        } else {
        }
    });
}

//  ログアウト処理
if (document.getElementById('submitLogout')) {
    const submitLogoutDOM = document.getElementById('submitLogout');    //  ログアウトボタンのDOM取得
    //  クリック時にログアウト確認ダイアログを表示
    submitLogoutDOM.addEventListener('click', () => {
        const isConfirmed = window.confirm("ログアウトしますか？")
        //  "OK"を押された場合にログアウトする
        if (isConfirmed) {
            auth.signOut(); //  ログアウト実行
            window.location.href = "./index.html";  //  ログイン画面に遷移
        }

    })
}
//  Googleログインユーザ登録
export const addUser = async(authResult) => {
    const uid = authResult.user.uid;    //  ユーザーID
    const db = getFirestore();
    const userData = {
        email: authResult.user.email,
        name: authResult.user.displayName,
    };
    const docRef = doc(db, "users", uid);
    // 既存のフィールドを更新
    try {
        await setDoc(docRef, userData)
        .then(() => {
            console.log("ユーザー情報が更新されました");
            window.location.href="./menu.html"
        })
    } catch (error) {
        console.log(error);
    }
}
//  利用コンビニ、住まいの地域登録
if (document.getElementById('menu-form')) {
    const submitMenuDOM = document.getElementById('submitMenu');
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const uid = user.uid;
            submitMenuDOM.addEventListener('click', async(event) => {
                event.preventDefault();
                const conveni = document.querySelector('input[name="conveni"]:checked').value;
                // 地域名の選択値を取得
                const region = document.getElementById('region').value;
                // 都道府県名の選択値を取得
                const prefecture = document.getElementById('prefecture').value;
                try {
                    const response  = await axios.post('/api/v1/menu', {
                        uid: uid,
                        conveni: conveni,
                        region: region,
                        prefecture: prefecture
                    })
                    console.log(response.data);
                    window.location.href='./home.html';
                } catch (error) {
                    console.log(error);
                }
                
            })
        }
        else {
            console.log("ユーザID取得に失敗しました");
        }
    })
}

