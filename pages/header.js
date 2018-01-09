module.exports = function (req) {
  const currentPage = req.route.path;

  const navData = [
    {
      url: "/",
      title: "Главная"
    },
    {
      url: "/events",
      title: "События"
    },
    {
      url: "/users",
      title: "Сотрудники"
    },
    {
      url: "/rooms",
      title: "Переговорки"
    },
  ];

  const namItems = navData.map(item => {
    let href= `href=${item.url}`;

    if(item.url == currentPage) {
      href = '';
    }

    return `<a ${href}>${item.title}</a>`;
  });

  const output = `<header class="page-header">
    <div class="page-header__content container">
    <h1 class="page-header__title">Бронирование переговорок</h1>

    <nav>
      ${namItems.join('\n')}
    </nav>
  </header>`;

  return output;
};
