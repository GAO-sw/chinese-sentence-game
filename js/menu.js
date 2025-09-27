document.addEventListener('DOMContentLoaded', () => {
    const lessonListContainer = document.getElementById('lesson-list');

    fetch('lessons.json')
        .then(response => response.json())
        .then(data => {
            // 清空旧的列表容器
            lessonListContainer.innerHTML = ''; 

            // 遍历每个HSK等级
            data.forEach(level => {
                // 创建整个等级的容器
                const levelContainer = document.createElement('div');
                levelContainer.classList.add('level-container');

                // 创建可点击的标题
                const levelHeader = document.createElement('h3');
                levelHeader.classList.add('level-header');
                levelHeader.innerHTML = `
                    <span class="lang-zh">${level.level_name.zh}</span>
                    <span class="lang-ru">${level.level_name.ru}</span>
                `;

                // 创建包含课程链接的容器
                const lessonGroup = document.createElement('div');
                lessonGroup.classList.add('lesson-group');

                // 遍历该等级下的所有课程，并创建链接
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

                // 默认将课程组折叠
                levelHeader.classList.add('collapsed');
                lessonGroup.classList.add('collapsed');
                
                // 为标题添加点击事件，用于展开/折叠
                levelHeader.addEventListener('click', () => {
                    levelHeader.classList.toggle('collapsed');
                    lessonGroup.classList.toggle('collapsed');
                });

                // 将标题和课程组添加到等级容器中
                levelContainer.appendChild(levelHeader);
                levelContainer.appendChild(lessonGroup);

                // 将整个等级容器添加到主列表中
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
