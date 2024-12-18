import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
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
                window.location.href = "./home.html";
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


