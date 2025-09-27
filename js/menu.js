document.addEventListener('DOMContentLoaded', () => {
    const lessonListContainer = document.getElementById('lesson-list');

    fetch('lessons.json')
        .then(response => response.json())
        .then(data => {
            lessonListContainer.innerHTML = ''; 

            data.forEach(level => {
                const levelContainer = document.createElement('div');
                levelContainer.classList.add('level-container');

                const levelHeader = document.createElement('h3');
                levelHeader.classList.add('level-header');
                levelHeader.innerHTML = `
                    <span class="lang-zh">${level.level_name.zh}</span>
                    <span class="lang-ru">${level.level_name.ru}</span>
                `;

                const lessonGroup = document.createElement('div');
                lessonGroup.classList.add('lesson-group');

                level.lessons.forEach(lesson => {
                    const link = document.createElement('a');
                    link.href = `game.html?lesson=${lesson.id}`;
                    link.classList.add('lesson-link');
                    link.innerHTML = `
                        <span class="lang-zh">${lesson.title.zh}</span>
                        <span class="lang-ru">${lesson.title.ru}</span>
                    `;
                    lessonGroup.appendChild(link);
                });

                levelHeader.classList.add('collapsed');
                lessonGroup.classList.add('collapsed');
                
                levelHeader.addEventListener('click', () => {
                    levelHeader.classList.toggle('collapsed');
                    lessonGroup.classList.toggle('collapsed');
                });

                levelContainer.appendChild(levelHeader);
                levelContainer.appendChild(lessonGroup);
                lessonListContainer.appendChild(levelContainer);
            });
        })
        .catch(error => {
            console.error('无法加载或解析课程列表:', error);
            lessonListContainer.innerHTML = `
                <span class="lang-zh">加载课程列表失败，请检查 lessons.json 文件是否存在且格式正确。</span>
                <span class="lang-ru">Не удалось загрузить список уроков. Проверьте, существует ли файл lessons.json и правильный ли у него формат.</span>
            `;
        });
});
