import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseauth.js";

// // Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const itemsDOM = document.getElementById('itemRow');
const selectStoreDOM = document.getElementById('selectStore');
const selectOrderDOM = document.getElementById('selectOrder');

// 商品表示関数
export const getFavorites = async () => {
    onAuthStateChanged(auth, async (user) => {
        try {
            const uid = user.uid; // ユーザーIDを取得
            console.log(`getFavorites ログインユーザーID: ${uid}`);
            const response = await axios.get(`/api/v1/favorites?uid=${uid}`);
            const { data: { productData, conveni, productIds, option, order } } = response; //  商品データ,お気に入り商品配列,利用コンビニ
            console.log("getFavorites 利用コンビニ名", conveni)
            let sortOption; //  並び替え
            // conveniに基づいてselectの値を設定
            if (conveni) {
                // conveniに一致するoptionにselectedを追加
                const options = selectStoreDOM.options;
                for (let option of options) {
                    if (option.value === conveni) {
                        option.selected = true;
                    }
                }
            }
            //  並び替えオプションをチェック
            if (option === 'date') {
                sortOption = '新着商品'
            }
            else if (option === 'price') {
                if (order === 'asc') {
                    sortOption = '安い順'
                }
                else {
                    sortOption = '高い順'
                }
            }
            console.log("getFavorites 現在の並び替えオプション", sortOption);
            // conveniに基づいてselectの値を設定
            // 並び替えオプションを設定
            if (sortOption) {
                const options = selectOrderDOM.options;
                for (let opt of options) {
                    opt.selected = (opt.value === sortOption);
                }
            }
            if (productData!=undefined) {
                // 商品カードを生成
                const productCard = productData.map(product => {
                    const { id, name, price, date, image, regions, allergies,category } = product;
                    return `<div class="col">
                    <div class="card">
                        <img class="card-img-top" src="${image}" alt="商品画像">
                        <div class="card-body">
                            <h6 class="card-title">${name}</h6>
                            ${category ? `<p class="card-text">商品カテゴリー：${category}</p>` : ''}
                            <p class="card-text">販売価格:${price}円(税込み)</p>
                            <p class="card-text">${date}以降順次発売</p>
                            ${regions ? `<p class="card-text">販売地域：${regions}</p>` : ''}
                            <p class="card-text">アレルギー情報：${allergies}</p>
                           <div class="btn btn-outline-primary favoritesButton" id="${id}" onclick="toggleLike(this)">
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
                itemsDOM.innerHTML = productCard; // 商品カードをDOMに挿入
            }
            console.log("お気に入り配列", productIds);
            //  商品カードを表示する際にお気に入り商品のボタンをお気に入り済みに変更
            if (productIds != undefined) {
                productIds.forEach(product_id => {
                    console.log(product_id)
                    const button = document.getElementById(product_id);
                    if (button) {
                        button.classList.add("active");
                        const text = button.querySelector("span");
                        if (text) {
                            text.textContent = "お気に入り済み";
                        }
                    }
                });
            }
            // お気に入りボタンにイベントリスナーを追加
            const favoriteButtons = document.querySelectorAll(".favoritesButton");
            favoriteButtons.forEach(button => {
                button.addEventListener('click', async (event) => {
                    const buttonElement = event.currentTarget; // イベントが発生したボタン要素
                    const product_id = event.currentTarget.id; // 現在のボタンのidを取得
                    console.log("押されたボタンの商品id:", product_id);
                    // ボタンにactiveクラスをトグル
                    if (buttonElement.classList.contains('active')) {
                        const response = await axios.post('/api/v1/favorites', { uid, product_id });
                        console.log(response.data)
                        window.alert("お気に入り登録に成功しました")
                        location.reload()
                    }
                    else {
                        const response = await axios.delete('/api/v1/favorites', {
                            data: { uid, product_id }
                        });
                        console.log(response.data)
                        window.alert("お気に入り解除に成功しました")
                        location.reload()
                    }
                });
            });
        } catch (error) {
            console.error("アイテムの取得に失敗しました:", error);
        }
    })
};
await getFavorites();