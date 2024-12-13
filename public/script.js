import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, setDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const itemsDOM = document.getElementById('itemRow');

// 商品表示関数
const showItems = async () => {
    try {
        const response = await axios.get("/api/v1/item"); // 商品データをAPIから取得
        const { data: { items } } = response;

        // 商品カードを生成
        const allItems = items.map(item => {
            const { id, name, price, launch, imageUrl, regions } = item;
            const taxedPrice = Math.floor(price * 1.08); // 税込み価格計算
            return `<div class="col">
                <div class="card">
                    <img class="card-img-top" src="${imageUrl}" alt="商品画像">
                    <div class="card-body">
                        <h6 class="card-title">${name}</h6>
                        <p class="card-text">${price}円（税込${taxedPrice}円）</p>
                        <p class="card-text">${launch}以降順次発売</p>
                        <p class="card-text">販売地域：${regions}</p>
                       <div class="btn btn-outline-primary like-button" id="${id}" onclick="toggleLike(this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" 
                                class="icon bi bi-hand-thumbs-up" viewBox="0 0 16 16">
                                <path
                                d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2 2 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a10 10 0 0 0-.443.05 9.4 9.4 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a9 9 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.2 2.2 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.9.9 0 0 1-.121.416c-.165.288-.503.56-1.066.56z" />
                            </svg>
                            <span>お気に入り</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join("");
        // console.log(allItems);
        itemsDOM.innerHTML = allItems; // 商品カードをDOMに挿入

        // お気に入りボタンにイベントリスナーを追加
        const favoriteButtons = document.querySelectorAll(".like-button");
        favoriteButtons.forEach(button => {
            button.addEventListener("click", () => toggleFavorite(button));
        });
    } catch (error) {
        console.error("アイテムの取得に失敗しました:", error);
    }
};

// お気に入り登録・解除関数
const toggleFavorite = async (button) => {
    const itemId = button.id; // ボタンのIDを取得
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const uid = user.uid; // ユーザーIDを取得
            console.log(`ログインユーザーID: ${uid}`);
            const docRef = doc(db, "favorites", `${uid}_${itemId}`); // お気に入りデータの参照を作成
            const isFavorited = button.classList.contains("favorited");

            try {
                const itemDocRef = doc(db, "items", itemId);
                const itemDoc = await getDoc(itemDocRef);

                if (itemDoc.exists()) {
                    const currentFavorites = itemDoc.data().favorites || 0;

                    if (isFavorited) {
                        await deleteDoc(docRef); // Firestoreからお気に入りを削除
                        button.classList.remove("favorited"); // ボタンの状態を解除
                        alert("お気に入りを解除しました");

                        // favoritesを-1更新
                        await updateDoc(itemDocRef, {
                            favorites: currentFavorites > 0 ? currentFavorites - 1 : 0
                        });
                        console.log("favoritesを減少させました");
                    } else {
                        await setDoc(docRef, { user_id: uid, item_id: itemId }); // Firestoreにお気に入りを保存
                        button.classList.add("favorited"); // ボタンの状態をお気に入りに変更
                        alert("お気に入りに登録しました");

                        // favoritesを+1更新
                        await updateDoc(itemDocRef, {
                            favorites: currentFavorites + 1
                        });
                        console.log("favoritesを増加させました");
                    }
                } else {
                    console.log("アイテムが見つかりませんでした");
                }
            } catch (error) {
                console.error("お気に入り操作に失敗しました:", error);
                alert("お気に入り操作に失敗しました。もう一度お試しください。");
            }
        } else {
            alert("ログインしていないため、お気に入り登録に失敗しました");
        }
    });
};

// 初期化
showItems();
