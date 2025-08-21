// js/game.js (完整修正版)
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
                buildQuestionUI(question, params);
            });

            document.querySelectorAll('.generate-link-btn').forEach(button => {
                button.addEventListener('click', () => generateShareLink(lessonId));
            });
        })
        .catch(error => {
            console.error('加载课程数据失败:', error);
            lessonTitleEl.innerHTML = `<span class="lang-zh">错误</span><span class="lang-ru">Ошибка</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">加载课程数据失败！</span><span class="lang-ru">Не удалось загрузить данные урока!</span>`;
        });
});

function buildQuestionUI(question, params) {
    const gameBoard = document.getElementById('game-board');
    const questionContainer = document.createElement('div');
    questionContainer.classList.add('question-container');
    questionContainer.id = `question-${question.id}`;

    const submittedAnswer = params.get(`q${question.id}`);
    
    let sentenceWordsHTML = `<div class="word-block core-word">${question.coreWord}</div>`;
    let wordPool = JSON.parse(JSON.stringify(question.wordPool)); // 深拷贝以防修改原始数据

    if (submittedAnswer) {
        const result = reconstructState(submittedAnswer, question.coreWord, wordPool);
        sentenceWordsHTML = result.sentenceHTML;
        wordPool = result.remainingWords;
    }

    // --- 关键部分：这里必须使用反引号 ` ` ---
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

        <div class="submission-area">
            <button class="generate-link-btn" data-question-id="${question.id}">
                <span class="lang-zh">生成作业链接</span><span class="lang-ru">Сгенерировать ссылку</span>
            </button>
            <input type="text" id="result-link-${question.id}" class="result-link-input" readonly placeholder="点击上方按钮生成一个包含所有题目答案的链接...">
        </div>
    `;
    
    questionContainer.innerHTML = questionHTML;
    gameBoard.appendChild(questionContainer);
    
    initializeSortable(question.id);
}

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
        group: groupName,
        animation: 150,
        onMove: evt => !(evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool'))
    });
    
    wordPools.forEach(pool => new Sortable(pool, { group: groupName, animation: 150 }));
}

function generateShareLink(lessonId) {
    const baseUrl = `${window.location.origin}${window.location.pathname}?lesson=${lessonId}`;
    let paramsArray = [];

    document.querySelectorAll('.question-container').forEach(container => {
        const qId = container.id.split('-');
        const sentenceBox = container.querySelector('.sentence-box');
        
        const words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => {
            let word = block.textContent;
            if (block.classList.contains('core-word')) {
                word += '*';
            }
            return word;
        });

        if (words.length > 1 || (words.length === 1 && !words.endsWith('*'))) {
            paramsArray.push(`q${qId}=${encodeURIComponent(words.join(' '))}`);
        }
    });

    const finalUrl = paramsArray.length > 0 ? `${baseUrl}&${paramsArray.join('&')}` : baseUrl;
    
    // 让所有输入框都显示最终的链接
    document.querySelectorAll('.result-link-input').forEach(input => {
        input.value = finalUrl;
    });

    // 默认选中第一个输入框的内容方便复制
    const firstInput = document.getElementById('result-link-1');
    if (firstInput) {
        firstInput.select();
    }
    
    alert('链接已生成！一个链接包含了所有题目的答案。请复制链接发给老师。');
}
