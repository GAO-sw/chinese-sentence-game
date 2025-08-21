document.addEventListener('DOMContentLoaded', () => {
    const lessonList = document.getElementById('lesson-list');

    fetch('lessons.json')
        .then(response => response.json())
        .then(lessons => {
            lessons.forEach(lesson => {
                const link = document.createElement('a');
                // 同时显示中文和俄语标题
                link.innerHTML = `
                    <span class="lang-zh">${lesson.title.zh}</span>
                    <span class="lang-ru">${lesson.title.ru}</span>
                `;
                link.href = `game.html?lesson=${lesson.id}`;
                link.classList.add('lesson-link');
                lessonList.appendChild(link);
            });
        })
        .catch(error => {
            console.error('无法加载课程列表:', error);
            lessonList.innerHTML = `
                <span class="lang-zh">加载课程列表失败，请检查文件是否存在。</span>
                <span class="lang-ru">Не удалось загрузить список уроков. Проверьте, существует ли файл.</span>
            `;
        });
});
