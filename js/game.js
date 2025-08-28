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
            
            // 仅在课程数据中未明确禁用时才创建提交区域
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

function buildQuestionUI(question, params) {
    const gameBoard = document.getElementById('game-board');
    const questionContainer = document.createElement('div');
    questionContainer.classList.add('question-container');
    questionContainer.id = `question-${question.id}`;

    // 根据题目类型来决定如何构建UI
    const questionType = question.type || 'build'; // 默认为旧的'build'类型
    let questionHTML = '';

    switch (questionType) {
        case 'sort':
            questionHTML = buildSortQuestion(question);
            break;
        case 'build':
        default:
            questionHTML = buildBuildQuestion(question, params);
            break;
    }
    
    questionContainer.innerHTML = questionHTML;
    gameBoard.appendChild(questionContainer);
    
    // 初始化拖拽逻辑和事件监听器
    initializeSortable(question);

    if (questionType === 'sort') {
        const showAnswerBtn = questionContainer.querySelector(`#btn-answer-${question.id}`);
        const answerContainer = questionContainer.querySelector(`#answer-${question.id}`);
        showAnswerBtn.addEventListener('click', () => {
            answerContainer.classList.toggle('visible');
        });
    }
}

// 构建新的“排序题”HTML
function buildSortQuestion(question) {
    const sentenceWordsHTML = question.scrambled_words.map(word => `<div class="word-block">${word}</div>`).join('');

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

// 构建旧的“造句题”HTML (代码从旧版buildQuestionUI迁移过来)
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
                        <div id="pool-${question.id}-${category.replace(/\s|[
