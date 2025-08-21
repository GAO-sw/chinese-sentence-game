// js/game.js (最终优化版)
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');

    const lessonTitleEl = document.getElementById('lesson-title');
    const lessonInstructionsEl = document.getElementById('lesson-instructions');
    const gameBoard = document.getElementById('game-board');

    if (!lessonId) {
        // ... (错误处理，保持不变)
        return;
    }

    fetch(`data/${lessonId}.json`)
        .then(response => response.json())
        .then(data => {
            lessonTitleEl.innerHTML = `<span class="lang-zh">${data.title.zh}</span><span class="lang-ru">${data.title.ru}</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">${data.instructions.zh}</span><span class="lang-ru">${data.instructions.ru}</span>`;

            // 1. 像以前一样，遍历并创建所有的题目UI
            data.questions.forEach(question => {
                buildQuestionUI(question, params);
            });
            
            // 2. 【新改动】在所有题目都创建完毕后，再创建唯一的提交区域
            createFinalSubmitArea(lessonId);
        })
        .catch(error => {
            console.error('加载课程数据失败:', error);
            // ... (错误处理，保持不变)
        });
});

function buildQuestionUI(question, params) {
    const gameBoard = document.getElementById('game-board');
    const questionContainer = document.createElement('div');
    questionContainer.classList.add('question-container');
    questionContainer.id = `question-${question.id}`;

    // ... (这部分逻辑保持不变，用于恢复URL中的答案)
    const submittedAnswer = params.get(`q${question.id}`);
    let sentenceWordsHTML = `<div class="word-block core-word">${question.coreWord}</div>`;
    let wordPool = JSON.parse(JSON.stringify(question.wordPool));
    if (submittedAnswer) {
        const result = reconstructState(submittedAnswer, question.coreWord, wordPool);
        sentenceWordsHTML = result.sentenceHTML;
        wordPool = result.remainingWords;
    }

    // --- 关键改动：移除了底部的 "submission-area" ---
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
            <div id="sentence-box-${question.id}" class="word-box-container sentence-box">${sentenceWordsHTML}</div>
        </div>
        <div class="word-pool-area">
            <div class="word-pool-prompt">
                <span class="lang-zh">备选词库：</span><span class="lang-ru">Банк слов:</span>
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

// 【新增函数】用于创建页面底部的总提交区域
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

    // 将这个容器插入到所有题目(#game-board)的后面
    gameBoard.insertAdjacentElement('afterend', submitContainer);

    // 为这个唯一的按钮绑定点击事件
    document.getElementById('generate-final-link-btn').addEventListener('click', () => {
        generateShareLink(lessonId);
    });
}

function generateShareLink(lessonId) {
    const baseUrl = `${window.location.origin}${window.location.pathname}?lesson=${lessonId}`;
    let paramsArray = [];

    document.querySelectorAll('.question-container').forEach(container => {
        const qId = container.id.split('-')[1]; // 获取题目ID
        const sentenceBox = container.querySelector('.sentence-box');
        
        const words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => {
            let word = block.textContent;
            if (block.classList.contains('core-word')) {
                word += '*';
            }
            return word;
        });

        // 只有当句子区有内容时才生成参数 (至少有一个非核心词)
        if (words.length > 1 || (words.length === 1 && !words[0].endsWith('*'))) {
            paramsArray.push(`q${qId}=${encodeURIComponent(words.join(' '))}`);
        }
    });

    const finalUrl = paramsArray.length > 0 ? `${baseUrl}&${paramsArray.join('&')}` : baseUrl;
    
    // 更新唯一的那个输入框
    const finalInput = document.getElementById('final-result-link');
    finalInput.value = finalUrl;
    finalInput.select();
    
    alert('总链接已生成！一个链接包含了所有题目的答案。请复制链接发给老师。');
}


// --- 其他辅助函数 (保持不变) ---
function reconstructState(answerStr, coreWord, initialWordPool) {
    const sentenceWords = decodeURIComponent(answerStr).split(' ');
    const sentenceHTML = sentenceWords.map(word => {
        const isCore = word.endsWith('*');
        const cleanWord = isCore ? word.slice(0, -1) : word;
        const className = isCore ? 'word-block core-word' : 'word-block';
        return `<div class="${className}">${cleanWord}</div>`;
    }).join('');

    const remainingWords = initialWordPool;
    sentenceWords.forEach(word => {
        const cleanWord = word.endsWith('*') ? word.slice(0, -1) : word;
        if (cleanWord === coreWord) return;
        for (const category in remainingWords) {
            const index = remainingWords[category].indexOf(cleanWord);
            if (index > -1) {
                remainingWords[category].splice(index, 1);
                return;
            }
        }
    });
    return { sentenceHTML, remainingWords };
}

function initializeSortable(questionId) {
    const sentenceBox = document.getElementById(`sentence-box-${questionId}`);
    const wordPools = document.querySelectorAll(`#question-${questionId} .word-pool`);
    const groupName = `group-${questionId}`;
    
    new Sortable(sentenceBox, {
        group: groupName, animation: 150,
        onMove: evt => !(evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool'))
    });
    
    wordPools.forEach(pool => new Sortable(pool, { group: groupName, animation: 150 }));
}
