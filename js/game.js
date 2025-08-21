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
            // 1. 设置课程标题和说明
            lessonTitleEl.innerHTML = `<span class="lang-zh">${data.title.zh}</span><span class="lang-ru">${data.title.ru}</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">${data.instructions.zh}</span><span class="lang-ru">${data.instructions.ru}</span>`;

            // 2. 遍历数据中的每一个问题，并创建对应的HTML结构
            data.questions.forEach(question => {
                const questionContainer = document.createElement('div');
                questionContainer.classList.add('question-container');

                const questionHTML = `
                    <div class="question-header">
                        <span class="lang-zh">第 ${question.id} 题</span>
                        <span class="lang-ru">Задание ${question.id}</span>
                        <div class="core-word-display">
                            <span class="lang-zh">核心词：</span><span class="lang-ru">Ключевое слово:</span>
                            <div class="word-block core-word">${question.coreWord}</div>
                        </div>
                    </div>
                    
                    <div class="sentence-area">
                        <div class="sentence-prompt">
                            <span class="lang-zh">句子区：</span><span class="lang-ru">Зона для предложений:</span>
                        </div>
                        <div id="sentence-box-${question.id}" class="word-box-container sentence-box"></div>
                    </div>

                    <div class="word-pool-area">
                         <div class="word-pool-prompt">
                            <span class="lang-zh">备选词库：</span><span class="lang-ru">Банк слов:</span>
                        </div>
                        <div class="word-pool-grid">
                            ${Object.keys(question.wordPool).map(category => `
                                <div class="word-category">
                                    <h4 class="category-title">${category}</h4>
                                    <div id="pool-${question.id}-${category.replace(/\s|\(|\)/g, '')}" class="word-box-container word-pool">
                                        ${question.wordPool[category].map(word => `<div class="word-block">${word}</div>`).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                questionContainer.innerHTML = questionHTML;
                gameBoard.appendChild(questionContainer);

                // 3. 为当前问题的所有词库和句子区初始化拖拽功能
                const sentenceBox = document.getElementById(`sentence-box-${question.id}`);
                const wordPools = questionContainer.querySelectorAll('.word-pool');
                const groupName = `group-${question.id}`; // 为每道题设置独立的组，防止互相拖拽

                new Sortable(sentenceBox, {
                    group: groupName,
                    animation: 150,
                    onAdd: function (evt) {
                        // 确保核心词被拖回来时恢复原样
                        if (evt.item.classList.contains('core-word-clone')) {
                             evt.item.classList.remove('core-word-clone');
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
