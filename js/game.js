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
                if (question.content && !question.type) question.type = 'explanation';
                if (!question.type) question.type = 'build';
                buildQuestionUI(question, params);
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

function buildQuestionUI(question, params) {
    const gameBoard = document.getElementById('game-board');
    const questionContainer = document.createElement('div');
    // --- NEW: Flashcard tests don't need the standard container style ---
    if (question.type !== 'flashcard') {
        questionContainer.classList.add('question-container');
    }
    questionContainer.id = `question-${question.id}`;

    let questionHTML = '';

    // --- NEW: Add 'flashcard' type to the switch ---
    switch (question.type) {
        case 'flashcard':
            questionHTML = buildFlashcardGrid(question);
            break;
        case 'explanation':
            questionHTML = buildExplanationCard(question);
            break;
        case 'sort':
            questionHTML = buildSortQuestion(question, params);
            break;
        case 'build':
        default:
            questionHTML = buildBuildQuestion(question, params);
            break;
    }
    
    questionContainer.innerHTML = questionHTML;
    gameBoard.appendChild(questionContainer);
    
    if (question.type === 'sort' || question.type === 'build') {
        initializeSortable(question);
    }

    // --- NEW: Add click listener for flashcards ---
    if (question.type === 'flashcard') {
        const cards = questionContainer.querySelectorAll('.flashcard');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('is-flipped');
            });
        });
    }

    if (question.answer) {
        const showAnswerBtn = questionContainer.querySelector(`#btn-answer-${question.id}`);
        const answerContainer = questionContainer.querySelector(`#answer-${question.id}`);
        if(showAnswerBtn && answerContainer) {
            showAnswerBtn.addEventListener('click', () => {
                answerContainer.classList.toggle('visible');
                const zh_btn = showAnswerBtn.querySelector('.lang-zh');
                const ru_btn = showAnswerBtn.querySelector('.lang-ru');
                if (answerContainer.classList.contains('visible')) {
                    zh_btn.textContent = '隐藏答案';
                    ru_btn.textContent = 'Скрыть ответ';
                } else {
                    zh_btn.textContent = '显示参考答案';
                    ru_btn.textContent = 'Показать ответ';
                }
            });
        }
    }
}

// --- NEW: Function to build the flashcard grid ---
function buildFlashcardGrid(question) {
    let cardsHTML = question.cards.map(card => `
        <div class="flashcard">
            <div class="flashcard-zh">${card.zh}</div>
            <div class="flashcard-ru">${card.ru}</div>
        </div>
    `).join('');

    return `<div class="flashcard-grid">${cardsHTML}</div>`;
}

function buildExplanationCard(question) {
    let contentHTML = question.content.map(line => {
        const zh = line.zh.replace(/\n/g, '<br>');
        const ru = line.ru.replace(/\n/g, '<br>');
        return `<p><span class="lang-zh">${zh}</span><span class="lang-ru">${ru}</span></p>`;
    }).join('');

    return `<div class="explanation-content">${contentHTML}</div>`;
}

function buildAnswerSectionHTML(question) {
    if (!question.answer) return '';
    const ruAnswerHTML = question.answer.ru ? `<div class="lang-ru">${question.answer.ru}</div>` : '';
    
    return `
        <div class="answer-reveal-section">
            <button id="btn-answer-${question.id}" class="show-answer-btn">
                <span class="lang-zh">显示参考答案</span><span class="lang-ru">Показать ответ</span>
            </button>
            <div id="answer-${question.id}" class="answer-container">
                <div class="lang-zh">${question.answer.zh.replace(/\n/g, '<br>')}</div>
                ${ruAnswerHTML}
            </div>
        </div>
    `;
}

function buildSortQuestion(question, params) {
    const submittedAnswer = params.get(`q${question.id}`);
    let sentenceWordsHTML = '';

    if (submittedAnswer) {
        const words = decodeURIComponent(submittedAnswer).split(' ');
        sentenceWordsHTML = words.map(word => `<div class="word-block">${word}</div>`).join('');
    } else {
        sentenceWordsHTML = question.scrambled_words.map(word => `<div class="word-block">${word}</div>`).join('');
    }
    
    return `
        <div class="question-header">
            <span class="lang-zh">${question.description.zh}</span><span class="lang-ru">${question.description.ru}</span>
        </div>
        <div class="sentence-area">
            <div id="sentence-box-${question.id}" class="word-box-container sentence-box">${sentenceWordsHTML}</div>
        </div>
        ${buildAnswerSectionHTML(question)}
    `;
}

function buildBuildQuestion(question, params) {
    const submittedAnswer = params.get(`q${question.id}`);
    const descriptionHTML = question.description ? `
        <div class="sentence-prompt">
            <span class="lang-zh">${question.description.zh}</span>
            <span class="lang-ru">${question.description.ru}</span>
        </div>
    ` : '';

    let sentenceWordsHTML = question.coreWord ? `<div class="word-block core-word">${question.coreWord}</div>` : '';
    if (submittedAnswer) {
        const result = reconstructState(submittedAnswer, question.coreWord);
        sentenceWordsHTML = result.sentenceHTML;
    }
    
    const coreWordDisplay = question.coreWord ? `
        <div class="core-word-display">
            <span class="lang-zh">核心词：</span><span class="lang-ru">Ключевое слово:</span>
            <div class="word-block core-word-reference">${question.coreWord}</div>
        </div>
    ` : '';

    return `
        <div class="question-header">
             <span class="lang-zh">${question.title.zh}</span><span class="lang-ru">${question.title.ru}</span>
             ${coreWordDisplay}
        </div>
        ${descriptionHTML}
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
        ${buildAnswerSectionHTML(question)}
    `;
}

function initializeSortable(question) {
    const questionId = question.id;
    const sentenceBox = document.getElementById(`sentence-box-${questionId}`);
    if (!sentenceBox) return;
    
    if (question.type === 'sort') {
        new Sortable(sentenceBox, { animation: 150 });
    } else {
        const wordPools = document.querySelectorAll(`#question-${questionId} .word-pool`);
        const groupName = `group-${questionId}`;
        new Sortable(sentenceBox, {
            group: groupName, 
            animation: 150,
            onMove: evt => !(evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool'))
        });
        wordPools.forEach(pool => {
            new Sortable(pool, {
                group: { name: groupName, pull: 'clone', put: true },
                animation: 150,
                sort: false,
                onAdd: function (evt) {
                    if (evt.to !== sentenceBox) { evt.item.remove(); }
                }
            });
        });
    }
}

function createFinalSubmitArea(lessonId) {
    const gameBoard = document.getElementById('game-board');
    const submitContainer = document.createElement('div');
    submitContainer.classList.add('final-submission-container');
    submitContainer.innerHTML = `<button id="generate-final-link-btn" class="generate-link-btn"><span class="lang-zh">完成作业，生成总链接</span><span class="lang-ru">Завершить и сгенерировать ссылку</span></button><input type="text" id="final-result-link" class="result-link-input" readonly placeholder="点击上方按钮生成一个包含所有题目答案的链接...">`;
    gameBoard.insertAdjacentElement('afterend', submitContainer);
    document.getElementById('generate-final-link-btn').addEventListener('click', () => generateShareLink(lessonId));
}

function generateShareLink(lessonId) {
    const baseUrl = `${window.location.origin}${window.location.pathname}?lesson=${lessonId}`;
    let paramsArray = [];
    document.querySelectorAll('.question-container').forEach(container => {
        const qId = container.id.split('-')[1];
        const sentenceBox = container.querySelector('.sentence-box');
        if (sentenceBox) {
            const words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => {
                let word = block.textContent;
                if (block.classList.contains('core-word')) { word += '*'; }
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
