// js/game.js (支持拖拽归还的最终版)
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');
    const lessonTitleEl = document.getElementById('lesson-title');
    const lessonInstructionsEl = document.getElementById('lesson-instructions');
    const gameBoard = document.getElementById('game-board');

    if (!lessonId) { /* ... 错误处理 ... */ return; }

    fetch(`data/${lessonId}.json`)
        .then(response => response.json())
        .then(data => {
            lessonTitleEl.innerHTML = `<span class="lang-zh">${data.title.zh}</span><span class="lang-ru">${data.title.ru}</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">${data.instructions.zh}</span><span class="lang-ru">${data.instructions.ru}</span>`;

            data.questions.forEach(question => {
                buildQuestionUI(question, params);
            });
            
            createFinalSubmitArea(lessonId);
        })
        .catch(error => { console.error('加载课程数据失败:', error); /* ... 错误处理 ... */ });
});

function buildQuestionUI(question, params) {
    const gameBoard = document.getElementById('game-board');
    const questionContainer = document.createElement('div');
    questionContainer.classList.add('question-container');
    questionContainer.id = `question-${question.id}`;

    const submittedAnswer = params.get(`q${question.id}`);
    let sentenceWordsHTML = `<div class="word-block core-word">${question.coreWord}</div>`;
    let wordPool = JSON.parse(JSON.stringify(question.wordPool));
    if (submittedAnswer) {
        const result = reconstructState(submittedAnswer, question.coreWord, wordPool);
        sentenceWordsHTML = result.sentenceHTML;
    }

    // --- 改动：更新了提示文本 ---
    const questionHTML = `
        <div class="question-header">
            <span class="lang-zh">第 ${question.id} 题</span><span class="lang-ru">Задание ${question.id}</span>
            <div class="core-word-display">
                <span class="lang-zh">核心词：</span><span class="lang-ru">Ключевое слово:</span>
                <div class="word-block core-word-reference">${question.coreWord}</div>
            </div>
        </div>
        <div class="sentence-area">
            <div class="sentence-prompt">
                <span class="lang-zh">句子区 (将不需要的词拖回备选区即可删除)：</span><span class="lang-ru">Зона для предложений (перетащите ненужные слова обратно в банк слов для удаления):</span>
            </div>
            <div id="sentence-box-${question.id}" class="word-box-container sentence-box">${sentenceWordsHTML}</div>
        </div>
        <div class="word-pool-area">
            <div class="word-pool-prompt">
                <span class="lang-zh">备选词库 (可重复拖拽)：</span><span class="lang-ru">Банк слов (можно перетаскивать многократно):</span>
            </div>
            <div class="word-pool-grid">
                ${Object.keys(wordPool).map(category => `
                    <div class="word-category">
                        <h4 class="category-title">${category}</h4>
                        <div id="pool-${question.id}-${category.replace(/\s|[()/]/g, '')}" class="word-box-container word-pool">
                            ${wordPool[category].map(word => `<div class="word-block">${word}</div>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    questionContainer.innerHTML = questionHTML;
    gameBoard.appendChild(questionContainer);
    
    initializeSortable(question.id);
}

function initializeSortable(questionId) {
    const sentenceBox = document.getElementById(`sentence-box-${questionId}`);
    const wordPools = document.querySelectorAll(`#question-${questionId} .word-pool`);
    const groupName = `group-${questionId}`;
    
    // --- ★ 改动 1：句子区的配置中，移除了 onAdd 事件 ---
    new Sortable(sentenceBox, {
        group: groupName, 
        animation: 150,
        onMove: evt => !(evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool'))
    });
    
    wordPools.forEach(pool => {
        new Sortable(pool, {
            // --- ★ 改动 2：修改了备选区的 group 配置 ---
            group: {
                name: groupName,
                pull: 'clone', 
                put: true // 允许词块被放入
            },
            animation: 150,
            sort: false,
            // --- ★ 改动 3：新增 onAdd 事件，实现“回收站”功能 ---
            onAdd: function (evt) {
                // 当任何词块被“添加”到这个备选区时，立即将其删除。
                evt.item.remove();
            }
        });
    });
}

// ... (createFinalSubmitArea, generateShareLink, reconstructState 函数保持不变) ...

function createFinalSubmitArea(lessonId) { /* ... 代码不变 ... */ }
function generateShareLink(lessonId) { /* ... 代码不变 ... */ }
function reconstructState(answerStr, coreWord, initialWordPool) { /* ... 代码不变 ... */ }

// --- 不变的代码部分 ---
function createFinalSubmitArea(lessonId) {
    const gameBoard = document.getElementById('game-board');
    const submitContainer = document.createElement('div');
    submitContainer.classList.add('final-submission-container');

    submitContainer.innerHTML = `
        <button id="generate-final-link-btn" class="generate-link-btn">
            <span class="lang-zh">完成作业，生成总链接</span>
            <span class="lang-ru">Завершить и сгенерировать ссылку</span>
        </button>
        <input type="text" id="final-result-link" class="result-link-input" readonly placeholder="点击上方按钮生成一个包含所有题目答案的链接...">
    `;

    gameBoard.insertAdjacentElement('afterend', submitContainer);

    document.getElementById('generate-final-link-btn').addEventListener('click', () => {
        generateShareLink(lessonId);
    });
}

function generateShareLink(lessonId) {
    const baseUrl = `${window.location.origin}${window.location.pathname}?lesson=${lessonId}`;
    let paramsArray = [];

    document.querySelectorAll('.question-container').forEach(container => {
        const qId = container.id.split('-')[1];
        const sentenceBox = container.querySelector('.sentence-box');
        
        const words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => {
            let word = block.textContent;
            if (block.classList.contains('core-word')) {
                word += '*';
            }
            return word;
        });

        if (words.length > 1 || (words.length === 1 && !words[0].endsWith('*'))) {
            paramsArray.push(`q${qId}=${encodeURIComponent(words.join(' '))}`);
        }
    });

    const finalUrl = paramsArray.length > 0 ? `${baseUrl}&${paramsArray.join('&')}` : baseUrl;
    
    const finalInput = document.getElementById('final-result-link');
    finalInput.value = finalUrl;
    finalInput.select();
    
    alert('总链接已生成！一个链接包含了所有题目的答案。请复制链接发给老师。');
}

function reconstructState(answerStr, coreWord, initialWordPool) {
    const sentenceWords = decodeURIComponent(answerStr).split(' ');
    const sentenceHTML = sentenceWords.map(word => {
        const isCore = word.endsWith('*');
        const cleanWord = isCore ? word.slice(0, -1) : word;
        const className = isCore ? 'word-block core-word' : 'word-block';
        return `<div class="${className}">${cleanWord}</div>`;
    }).join('');

    return { sentenceHTML, remainingWords: initialWordPool };
}
