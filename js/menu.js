document.addEventListener('DOMContentLoaded', () => {
    const lessonList = document.getElementById('lesson-list');

    // 读取课程列表文件
    fetch('lessons.json')
        .then(response => response.json())
        .then(lessons => {
            lessons.forEach(lesson => {
                // 为每一节课创建一个链接
                const link = document.createElement('a');
                link.textContent = lesson.title;
                link.href = `game.html?lesson=${lesson.id}`; // 关键点：通过URL参数传递课程ID
                link.classList.add('lesson-link');
                lessonList.appendChild(link);
            });
        })
        .catch(error => {
            console.error('无法加载课程列表:', error);
            lessonList.textContent = '加载课程列表失败，请检查文件是否存在。';
        });
});
