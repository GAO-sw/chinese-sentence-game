// js/game.js (更新后的版本)
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');

    const lessonTitleEl = document.getElementById('lesson-title');
    const lessonInstructionsEl = document.getElementById('lesson-instructions');
    const gameBoard = document.getElementById('game-board');

    if (!lessonId) {
        lessonTitleEl.innerHTML = `<span class="lang-zh">错误</span><span class="lang-ru">Ошибка</span>`;
        lessonInstructionsEl.innerHTML = `<span class="lang-zh">未指定课程！</span><span class="lang-ru">Урок не указан!</span>`;
        return;
    }

    fetch(`data/${lessonId}.json`)
        .then(response => response.json())
        .then(data => {
            lessonTitleEl.innerHTML = `<span class="lang-zh">${data.title.zh}</span><span class="lang-ru">${data.title.ru}</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">${data.instructions.zh}</span><span class="lang-ru">${data.instructions.ru}</span>`;

            data.questions.forEach(question => {
                const questionContainer = document.createElement('div');
                questionContainer.classList.add('question-container');

                // --- 修改 1: 在生成HTML时，直接将核心词放入句子区 ---
                // 我们在句子区 <div id="sentence-box-..."> 里直接插入了一个带 'core-word' 类的词汇方块。
                const questionHTML = `
                    <div class="question-header">
                        <span class="lang-zh">第 ${question.id} 题</span>
                        <span class="lang-ru">Задание ${question.id}</span>
                        <div class="core-word-display">
                            <span class="lang-zh">核心词：</span><span class="lang-ru">Ключевое слово:</span>
                            <div class="word-block core-word-reference">${question.coreWord}</div>
                        </div>
                    </div>
                    
                    <div class="sentence-area">
                        <div class="sentence-prompt">
                            <span class="lang-zh">句子区：</span><span class="lang-ru">Зона для предложений:</span>
                        </div>
                        <div id="sentence-box-${question.id}" class="word-box-container sentence-box">
                            <div class="word-block core-word">${question.coreWord}</div>
                        </div>
                    </div>

                    <div class="word-pool-area">
                         <div class="word-pool-prompt">
                            <span class="lang-zh">备选词库：</span><span class="lang-ru">Банк слов:</span>
                        </div>
                        <div class="word-pool-grid">
                            ${Object.keys(question.wordPool).map(category => `
                                <div class="word-category">
                                    <h4 class="category-title">${category}</h4>
                                    <div id="pool-${question.id}-${category.replace(/\s|[()/]/g, '')}" class="word-box-container word-pool">
                                        ${question.wordPool[category].map(word => `<div class="word-block">${word}</div>`).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                questionContainer.innerHTML = questionHTML;
                gameBoard.appendChild(questionContainer);

                const sentenceBox = document.getElementById(`sentence-box-${question.id}`);
                const wordPools = questionContainer.querySelectorAll('.word-pool');
                const groupName = `group-${question.id}`;

                // --- 修改 2: 更新句子区的拖拽逻辑 ---
                // 我们使用 onMove 事件来判断是否允许拖动。
                new Sortable(sentenceBox, {
                    group: groupName,
                    animation: 150,
                    onMove: function (evt) {
                        // 这段代码的含义是：
                        // 如果被拖动的元素(evt.dragged)带有 'core-word' 类,
                        // 并且目标区域(evt.to)是备选词库(带有 'word-pool' 类),
                        // 那么就返回 false，即“禁止本次移动”。
                        if (evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool')) {
                            return false; 
                        }
                    }
                });
                
                wordPools.forEach(pool => {
                    new Sortable(pool, {
                        group: groupName,
                        animation: 150
                    });
                });
            });
        })
        .catch(error => {
            console.error('加载课程数据失败:', error);
            lessonTitleEl.innerHTML = `<span class="lang-zh">错误</span><span class="lang-ru">Ошибка</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">加载课程数据失败！</span><span class="lang-ru">Не удалось загрузить данные урока!</span>`;
        });
});
