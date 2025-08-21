document.addEventListener('DOMContentLoaded', () => {
    // 1. 从URL获取课程ID
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');

    if (!lessonId) {
        document.getElementById('lesson-title').textContent = '错误：未指定课程！';
        return;
    }

    // 2. 根据课程ID加载对应的JSON数据文件
    fetch(`data/${lessonId}.json`)
        .then(response => response.json())
        .then(data => {
            const { title, coreWord, vocabulary } = data;

            // 3. 使用加载的数据来构建游戏界面
            document.getElementById('lesson-title').textContent = title;
            const wordPool = document.getElementById('word-pool');
            const sentenceBox = document.getElementById('sentence-box');

            // 放置核心词
            const coreWordBlock = document.createElement('div');
            coreWordBlock.textContent = coreWord;
            coreWordBlock.classList.add('word-block', 'core-word');
            sentenceBox.appendChild(coreWordBlock);

            // 放置备选词汇
            vocabulary.forEach(word => {
                if (word !== coreWord) {
                    const wordBlock = document.createElement('div');
                    wordBlock.textContent = word;
                    wordBlock.classList.add('word-block');
                    wordPool.appendChild(wordBlock);
                }
            });

            // 4. 初始化拖拽功能
            new Sortable(wordPool, {
                group: 'shared',
                animation: 150
            });

            new Sortable(sentenceBox, {
                group: 'shared',
                animation: 150,
                onMove: function (evt) {
                    return !evt.dragged.classList.contains('core-word');
                }
            });
        })
        .catch(error => {
            console.error('加载课程数据失败:', error);
            document.getElementById('lesson-title').textContent = '加载课程数据失败！';
        });
});
