
const regionToPrefecture = {
    "北海道": ["北海道"],
    "東北": ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
    "関東": ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
    "甲信越": ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県"],
    "北陸": ["富山県", "石川県", "福井県"],
    "東海": ["岐阜県", "静岡県", "愛知県", "三重県"],
    "近畿": ["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
    "中国": ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
    "四国": ["徳島県", "香川県", "愛媛県", "高知県"],
    "九州": ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
    "沖縄": ["沖縄県"]
  };

  document.getElementById('region').addEventListener('change', function () {
    const region = this.value;
    const prefectureSelect = document.getElementById('prefecture');
    prefectureSelect.innerHTML = '<option value="" disabled selected>選択してください</option>';
    if (regionToPrefecture[region]) {
      regionToPrefecture[region].forEach(prefecture => {
        const option = document.createElement('option');
        option.value = prefecture;
        option.textContent = prefecture;
        prefectureSelect.appendChild(option);
      });
    }
  });

  (() => {
    // チェックボックスのinputタグを取得
    const checkBoxElements = Array.from(document.getElementsByClassName("form-check-input me-1"));

    const errorMessage = "1つ以上の選択肢を選択してください。";
    checkBoxElements
        .forEach(m => {
            // エラーメッセージを、カスタムなものに変更
            m.setCustomValidity(errorMessage);

            // 各チェックボックスのチェックのオン・オフ時に、以下の処理が実行されるようにする
            m.addEventListener("change", () => {
                // 1つ以上チェックがされているかどうかを判定
                const isCheckedAtLeastOne = document.querySelector(".form-check-input me-1:checked") !== null;

                // 1つもチェックがされていなかったら、すべてのチェックボックスを required にする
                // 加えて、エラーメッセージも変更する
                checkBoxElements.forEach(n => {
                    n.required = !isCheckedAtLeastOne
                    n.setCustomValidity(isCheckedAtLeastOne ? "" : errorMessage);
                });
            });
        });
})();

document.addEventListener('DOMContentLoaded', function() {
    // ラジオボタンを初期化
    const radios = document.getElementsByName('conveni');
    radios.forEach(radio => {
      radio.checked = false;
    });

    // セレクトボックスを初期化
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
      select.selectedIndex = 0;  // 最初の選択肢に設定
    });
  });

  // キャッシュを無効化してページが戻ったときに選択状態をリセット
  if (performance.navigation.type === 2) {
    window.location.reload();
  }
