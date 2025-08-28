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
                if (!question.type) question.type = 'build';
                // Pass the lesson-wide flag to the UI builder
                buildQuestionUI(question, params, data.show_answers);
            });
            
            if (data.submission !== false) {
                createFinalSubmitArea(lessonId);
            }
        })
        .catch(error => {
            console.error('加载课程数据失败:', error);
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

    switch (question.type) {
        case 'sort':
            // Pass the flag down to the specific sort question builder
            questionHTML = buildSortQuestion(question, showAnswers);
            break;
        case 'build':
        default:
            questionHTML = buildBuildQuestion(question, params);
            break;
    }
    
    questionContainer.innerHTML = questionHTML;
    gameBoard.appendChild(questionContainer);
    
    initializeSortable(question);

    // Only add the click listener if the button was actually created
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

function buildSortQuestion(question, showAnswers) {
    const sentenceWordsHTML = question.scrambled_words.map(word => `<div class="word-block">${word}</div>`).join('');
    
    // Conditionally create the answer section HTML
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
            <span class="lang-zh">第 ${question.id} 题</span><span class="lang-ru">Задание ${question.id}</span>
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
    let sentenceWordsHTML = `<div class="word-block core-word">${question.coreWord}</div>`;
    let wordPool = JSON.parse(JSON.stringify(question.wordPool));
    if (submittedAnswer) {
        const result = reconstructState(submittedAnswer, question.coreWord, wordPool);
        sentenceWordsHTML = result.sentenceHTML;
    }

    return `
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
        // For sort questions, we also need to encode the answer. The logic is simpler.
        generateShareLink(lessonId);
    });
}

function generateShareLink(lessonId) {
    const baseUrl = `${window.location.origin}${window.location.pathname}?lesson=${lessonId}`;
    let paramsArray = [];

    document.querySelectorAll('.question-container').forEach(container => {
        const qId = container.id.split('-')[1];
        const sentenceBox = container.querySelector('.sentence-box');
        const questionType = document.getElementById(`question-${qId}`).querySelector('.word-pool-area') ? 'build' : 'sort';
        
        let words = [];
        if (questionType === 'build') {
            words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => {
                let word = block.textContent;
                if (block.classList.contains('core-word')) {
                    word += '*';
                }
                return word;
            });
        } else { // 'sort' type
            words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => block.textContent);
        }

        // Only add to params if there is an answer to submit
        if (words.length > 0) {
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
