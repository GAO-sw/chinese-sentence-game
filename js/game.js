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
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}, loading ${response.url}`); }
            return response.json();
        })
        .then(data => {
            lessonTitleEl.innerHTML = `<span class="lang-zh">${data.title.zh}</span><span class="lang-ru">${data.title.ru}</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">${data.instructions.zh}</span><span class="lang-ru">${data.instructions.ru}</span>`;
            data.questions.forEach(question => {
                buildQuestionUI(question, params);
            });
            if (data.submission !== false) { createFinalSubmitArea(lessonId); }
        })
        .catch(error => {
            console.error('加载或解析课程数据失败:', error);
            lessonTitleEl.innerHTML = `<span class="lang-zh">错误</span><span class="lang-ru">Ошибка</span>`;
            lessonInstructionsEl.innerHTML = `<span class="lang-zh">加载课程数据失败！请检查 data/${lessonId}.json 文件是否有效。(错误: ${error.message})</span><span class="lang-ru">Не удалось загрузить данные урока! Проверьте, что файл data/${lessonId}.json корректен. (Ошибка: ${error.message})</span>`;
        });
});

function buildQuestionUI(question, params) {
    const gameBoard = document.getElementById('game-board');
    // --- 修正点 1: 统一容器逻辑 ---
    const questionWrapper = document.createElement('div');
    questionWrapper.id = `question-${question.id}`;
    if (question.type !== 'flashcard' && question.type !== 'explanation') {
        questionWrapper.classList.add('question-container');
    }

    let questionHTML = '';
    const type = question.type || (question.cards ? 'flashcard' : (question.content ? 'explanation' : 'build'));

    switch (type) {
        case 'listening': questionHTML = buildListeningExercise(question); break;
        case 'flashcard': questionHTML = buildFlashcardGrid(question); break;
        case 'explanation': questionHTML = buildExplanationCard(question); break;
        case 'sort': questionHTML = buildSortQuestion(question, params); break;
        case 'build': default: questionHTML = buildBuildQuestion(question, params); break;
    }
    
    questionWrapper.innerHTML = questionHTML;
    gameBoard.appendChild(questionWrapper);
    
    if (type === 'sort' || type === 'build') { initializeSortable(question); }
    if (type === 'flashcard') {
        const cards = questionWrapper.querySelectorAll('.flashcard');
        cards.forEach(card => card.addEventListener('click', () => card.classList.toggle('is-flipped')));
    }
    if (type === 'listening') {
        const items = questionWrapper.querySelectorAll('.listening-item');
        items.forEach(item => {
            const btn = item.querySelector('.listening-reveal-btn');
            const content = item.querySelector('.listening-content');
            if (btn && content) {
                btn.addEventListener('click', () => {
                    content.classList.toggle('visible');
                    const [zh_btn, ru_btn] = [btn.querySelector('.lang-zh'), btn.querySelector('.lang-ru')];
                    if (content.classList.contains('visible')) { [zh_btn.textContent, ru_btn.textContent] = ['隐藏文本', 'Скрыть текст']; } 
                    else { [zh_btn.textContent, ru_btn.textContent] = ['显示文本', 'Показать текст']; }
                });
            }
        });
    }
    if (question.answer) {
        const showAnswerBtn = questionWrapper.querySelector(`#btn-answer-${question.id}`);
        const answerContainer = questionWrapper.querySelector(`#answer-${question.id}`);
        if (showAnswerBtn && answerContainer) {
            showAnswerBtn.addEventListener('click', () => {
                answerContainer.classList.toggle('visible');
                const [zh_btn, ru_btn] = [showAnswerBtn.querySelector('.lang-zh'), showAnswerBtn.querySelector('.lang-ru')];
                if (answerContainer.classList.contains('visible')) { [zh_btn.textContent, ru_btn.textContent] = ['隐藏答案', 'Скрыть ответ']; } 
                else { [zh_btn.textContent, ru_btn.textContent] = ['显示参考答案', 'Показать ответ']; }
            });
        }
    }
}

// --- 所有 build... 函数保持不变，但为了完整性全部提供 ---

function buildListeningExercise(question) {
    let itemsHTML = question.sentences.map((sentence, index) => `<div class="listening-item"><div class="listening-header"><span class="lang-zh">第 ${index + 1} 句</span><span class="lang-ru">Предложение ${index + 1}</span></div><button class="listening-reveal-btn"><span class="lang-zh">显示文本</span><span class="lang-ru">Показать текст</span></button><div class="listening-content"><p class="lang-zh">${sentence.zh}</p><p class="lang-ru">${sentence.ru}</p></div></div>`).join('');
    return `<div class="question-container"><div class="question-header"><span class="lang-zh">${question.title.zh}</span><span class="lang-ru">${question.title.ru}</span></div><div class="sentence-prompt"><span class="lang-zh">${question.description.zh}</span><span class="lang-ru">${question.description.ru}</span></div><div class="listening-grid">${itemsHTML}</div></div>`;
}

function buildFlashcardGrid(question) {
    let cardsHTML = question.cards.map(card => `<div class="flashcard"><div class="flashcard-zh">${card.zh}</div><div class="flashcard-ru">${card.ru}</div></div>`).join('');
    return `<div class="flashcard-grid">${cardsHTML}</div>`;
}

function buildExplanationCard(question) {
    let contentHTML = question.content.map(line => `<p><span class="lang-zh">${line.zh.replace(/\n/g, '<br>')}</span><span class="lang-ru">${line.ru.replace(/\n/g, '<br>')}</span></p>`).join('');
    return `<div class="question-container explanation-content">${contentHTML}</div>`;
}

function buildAnswerSectionHTML(question) {
    if (!question.answer) return '';
    const ruAnswerHTML = question.answer.ru ? `<div class="lang-ru">${question.answer.ru}</div>` : '';
    return `<div class="answer-reveal-section"><button id="btn-answer-${question.id}" class="show-answer-btn"><span class="lang-zh">显示参考答案</span><span class="lang-ru">Показать ответ</span></button><div id="answer-${question.id}" class="answer-container"><div class="lang-zh">${question.answer.zh.replace(/\n/g, '<br>')}</div>${ruAnswerHTML}</div></div>`;
}

function buildSortQuestion(question, params) {
    const submittedAnswer = params.get(`q${question.id}`);
    let sentenceWordsHTML = '';
    if (submittedAnswer) { sentenceWordsHTML = decodeURIComponent(submittedAnswer).split(' ').map(word => `<div class="word-block">${word}</div>`).join(''); } 
    else { sentenceWordsHTML = question.scrambled_words.map(word => `<div class="word-block">${word}</div>`).join(''); }
    return `<div class="question-header"><span class="lang-zh">${question.description.zh}</span><span class="lang-ru">${question.description.ru}</span></div><div class="sentence-area"><div id="sentence-box-${question.id}" class="word-box-container sentence-box">${sentenceWordsHTML}</div></div>${buildAnswerSectionHTML(question)}`;
}

function buildBuildQuestion(question, params) {
    const submittedAnswer = params.get(`q${question.id}`);
    const descriptionHTML = question.description ? `<div class="sentence-prompt"><span class="lang-zh">${question.description.zh}</span><span class="lang-ru">${question.description.ru}</span></div>` : '';
    let sentenceWordsHTML = question.coreWord ? `<div class="word-block core-word">${question.coreWord}</div>` : '';
    if (submittedAnswer) { sentenceWordsHTML = reconstructState(submittedAnswer, question.coreWord).sentenceHTML; }
    const coreWordDisplay = question.coreWord ? `<div class="core-word-display"><span class="lang-zh">核心词：</span><span class="lang-ru">Ключевое слово:</span><div class="word-block core-word-reference">${question.coreWord}</div></div>` : '';
    return `<div class="question-header"><span class="lang-zh">${question.title.zh}</span><span class="lang-ru">${question.title.ru}</span>${coreWordDisplay}</div>${descriptionHTML}<div class="sentence-area"><div class="sentence-prompt"><span class="lang-zh">句子区：</span><span class="lang-ru">Зона для предложений:</span></div><div id="sentence-box-${question.id}" class="word-box-container sentence-box">${sentenceWordsHTML}</div></div><div class="word-pool-area"><div class="word-pool-prompt"><span class="lang-zh">备选词库：</span><span class="lang-ru">Банк слов:</span></div><div class="word-pool-grid">${Object.keys(question.wordPool).map(category => `<div class="word-category"><h4 class="category-title">${category}</h4><div id="pool-${question.id}-${category.replace(/\s|[()/]/g, '')}" class="word-box-container word-pool">${question.wordPool[category].map(word => `<div class="word-block">${word}</div>`).join('')}</div></div>`).join('')}</div></div>${buildAnswerSectionHTML(question)}`;
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
        new Sortable(sentenceBox, { group: groupName, animation: 150, onMove: evt => !(evt.dragged.classList.contains('core-word') && evt.to.classList.contains('word-pool')) });
        wordPools.forEach(pool => { new Sortable(pool, { group: { name: groupName, pull: 'clone', put: true }, animation: 150, sort: false, onAdd: function (evt) { if (evt.to !== sentenceBox) { evt.item.remove(); } } }); });
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
    // --- 修正点 2: 通过更可靠的方式查找容器 ---
    document.querySelectorAll('[id^="question-"]').forEach(container => {
        const qId = container.id.split('-')[1];
        const sentenceBox = container.querySelector('.sentence-box');
        if (sentenceBox) {
            const words = Array.from(sentenceBox.querySelectorAll('.word-block')).map(block => { let word = block.textContent; if (block.classList.contains('core-word')) { word += '*'; } return word; });
            if (words.length > 0) { paramsArray.push(`q${qId}=${encodeURIComponent(words.join(' '))}`); }
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
