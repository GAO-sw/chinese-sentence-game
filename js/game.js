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
        .then(response => {
            if (!response.ok) {
                throw new Error(`无法加载课程文件: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            lessonTitleEl.innerHTML = `<span class="lang-zh">${data.title.zh}</span><span class="lang-ru">${data.title.ru}</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">${data.instructions.zh}</span><span class="lang-ru">${data.instructions.ru}</span>`;

            data.questions.forEach(question => {
                // 为解释性卡片设置默认类型，以防JSON中忘记写
                if (question.content && !question.type) question.type = 'explanation';
                if (!question.type) question.type = 'build';
                buildQuestionUI(question, params, data.show_answers);
            });
            
            if (data.submission !== false) {
                createFinalSubmitArea(lessonId);
            }
        })
        .catch(error => {
            console.error('加载或解析课程数据失败:', error);
            lessonTitleEl.innerHTML = `<span class="lang-zh">错误</span><span class="lang-ru">Ошибка</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">加载课程数据失败！</span><span class="lang-ru">Не удалось загрузить данные урока!</span>`;
        });
});

function buildQuestionUI(question, params, showAnswers) {
    const gameBoard = document.getElementById('game-board');
    const questionContainer = document.createElement('div');
    questionContainer.classList.add('question-container');
    questionContainer.id = `question-${question.id}`;

    let questionHTML = '';

    // --- 这是核心修改部分 ---
    switch (question.type) {
        case 'explanation':
            questionHTML = buildExplanationCard(question);
            break;
        case 'sort':
            questionHTML = buildSortQuestion(question, params, showAnswers);
            break;
        case 'build':
        default:
            questionHTML = buildBuildQuestion(question, params);
            break;
    }
    // --- 修改结束 ---
    
    questionContainer.innerHTML = questionHTML;
    gameBoard.appendChild(questionContainer);
    
    // 只有在非解释性卡片时才初始化拖拽功能
    if (question.type === 'sort' || question.type === 'build') {
        initializeSortable(question);
    }

    if (question.type === 'sort' && showAnswers !== false) {
        const showAnswerBtn = questionContainer.querySelector(`#btn-answer-${question.id}`);
        const answerContainer = questionContainer.querySelector(`#answer-${question.id}`);
        showAnswerBtn.addEventListener('click', () => {
            answerContainer.classList.toggle('visible');
            if (answerContainer.classList.contains('visible')) {
                showAnswerBtn.querySelector('.lang-zh').textContent = '隐藏答案';
                showAnswerBtn.querySelector('.lang-ru').textContent = 'Скрыть ответ';
            } else {
                showAnswerBtn.querySelector('.lang-zh').textContent = '显示答案';
                showAnswerBtn.querySelector('.lang-ru').textContent = 'Показать ответ';
            }
        });
    }
}

// --- 这是新增的函数 ---
function buildExplanationCard(question) {
    let contentHTML = question.content.map(line => `
        <p>
            <span class="lang-zh">${line.zh}</span>
            <span class="lang-ru">${line.ru}</span>
        </p>
    `).join('');

    return `
        <div class="question-header">
            <span class="lang-zh">第 ${question.id} 部分: 学习与理解</span>
            <span class="lang-ru">Часть ${question.id}: Изучение и понимание</span>
        </div>
        <div class="explanation-content">${contentHTML}</div>
    `;
}
// --- 新增函数结束 ---


function buildSortQuestion(question, params, showAnswers) {
    const submittedAnswer = params.get(`q${question.id}`);
    let sentenceWordsHTML = '';

    if (submittedAnswer) {
        const words = decodeURIComponent(submittedAnswer).split(' ');
        sentenceWordsHTML = words.map(word => `<div class="word-block">${word}</div>`).join('');
    } else {
        sentenceWordsHTML = question.scrambled_words.map(word => `<div class="word-block">${word}</div>`).join('');
    }
    
    let answerSectionHTML = '';
    if (showAnswers !== false) {
        answerSectionHTML = `
            <div class="answer-reveal-section">
                <button id="btn-answer-${question.id}" class="show-answer-btn">
                    <span class="lang-zh">显示答案</span><span class="lang-ru">Показать ответ</span>
                </button>
                <div id="answer-${question.id}" class="answer-container">
                    <div class="lang-zh">${question.answer.zh}</div>
                    <div class="lang-ru">${question.answer.ru}</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="question-header">
            <span class="lang-zh">第 ${question.id} 题: 排序</span><span class="lang-ru">Задание ${question.id}: Сортировка</span>
        </div>
        <div class="sentence-area">
            <div class="sentence-prompt">
                <span class="lang-zh">请排序 (拖拽词块调整顺序)：</span><span class="lang-ru">Отсортируйте слова (перетащите, чтобы изменить порядок):</span>
            </div>
            <div id="sentence-box-${question.id}" class="word-box-container sentence-box">${sentenceWordsHTML}</div>
        </div>
        ${answerSectionHTML}
    `;
}

function buildBuildQuestion(question, params) {
    const submittedAnswer = params.get(`q${question.id}`);
    // 如果有情景描述，就显示它
    const descriptionHTML = question.description ? `
        <div class="sentence-prompt">
            <span class="lang-zh">${question.description.zh}</span>
            <span class="lang-ru">${question.description.ru}</span>
        </div>
    ` : '';

    let sentenceWordsHTML = `<div class="word-block core-word">${question.coreWord}</div>`;
    if (submittedAnswer) {
        const result = reconstructState(submittedAnswer, question.coreWord);
        sentenceWordsHTML = result.sentenceHTML;
    }

    return `
        <div class="question-header">
            <span class="lang-zh">第 ${question.id} 题: 造句</span><span class="lang-ru">Задание ${question.id}: Составление предложения</span>
            <div class="core-word-display">
                <span class="lang-zh">核心词：</span><span class="lang-ru">Ключевое слово:</span>
                <div class="word-block core-word-reference">${question.coreWord}</div>
            </div>
        </div>
        ${descriptionHTML}
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
}

function initializeSortable(question) {
    const questionId = question.id;
    const sentenceBox = document.getElementById(`sentence-box-${questionId}`);
    
    if (question.type === 'sort') {
        new Sortable(sentenceBox, {
            animation: 150
        });
    } else { // 'build' type
        const wordPools = document.querySelectorAll(`#question-${questionId} .word-pool`);
        const groupName = `group-${questionId}`;
        
        new Sortable(sentenceBox, {
            group: groupName, 
            animation: 150,
            onMove: evt => !(evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool'))
        });
        
        wordPools.forEach(pool => {
            new Sortable(pool, {
                group: {
                    name: groupName,
                    pull: 'clone', 
                    put: true
                },
                animation: 150,
                sort: false,
                onAdd: function (evt) {
                    if (evt.to !== sentenceBox) {
                        evt.item.remove();
                    }
                }
            });
        });
    }
}

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
        
        // 只有练习题有sentenceBox，解释性卡片没有，需要判断
        if (sentenceBox) {
            const words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => {
                let word = block.textContent;
                if (block.classList.contains('core-word')) {
                    word += '*';
                }
                return word;
            });

            if (words.length > 0) {
                paramsArray.push(`q${qId}=${encodeURIComponent(words.join(' '))}`);
            }
        }
    });

    const finalUrl = paramsArray.length > 0 ? `${baseUrl}&${paramsArray.join('&')}` : baseUrl;
    
    const finalInput = document.getElementById('final-result-link');
    finalInput.value = finalUrl;
    finalInput.select();
    
    alert('总链接已生成！一个链接包含了所有题目的答案。请复制链接发给老师。');
}

function reconstructState(answerStr, coreWord) {
    const sentenceWords = decodeURIComponent(answerStr).split(' ');
    const sentenceHTML = sentenceWords.map(word => {
        const isCore = word.endsWith('*');
        const cleanWord = isCore ? word.slice(0, -1) : word;
        const className = isCore ? 'word-block core-word' : 'word-block';
        return `<div class="${className}">${cleanWord}</div>`;
    }).join('');

    return { sentenceHTML };
}
