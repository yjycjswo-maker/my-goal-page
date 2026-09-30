// 원본 gabrielveres.com 의 Sanity ProjectsOverview 데이터와 같은 구조입니다.
// overviewItems 20개가 무한 고리를 만듭니다. (원본은 71개 · 13개 프로젝트 반복)
// image / title / link 만 바꾸면 자신의 프로젝트로 교체할 수 있습니다. page 를 주면 창 안에 그 HTML 페이지가 열립니다.
// 이미지 비율은 자유입니다. 카드 비율은 src/config.js 의 CARD_ASPECT 로 통일됩니다.
export const projects = {
  overviewLabel: 'Overview',
  listButton: { label: 'Index', href: '/projects' },
  overviewItems: [
    {
      image: "/images/card-01-page.webp",
      page: "/pages/page-01.html",
      title: "내가 이 수업을 듣게 된 이유",
      description: "클로드코드가 어서 타라길래, 탔습니다.",
      link: "",
    },
    {
      // page 가 있으면 카드를 클릭했을 때 창 안에 그 페이지가 열립니다. image 는 그 페이지의 첫 화면 스크린샷.
      image: "/images/card-02-page.webp",
      page: "/pages/page-02.html",
      title: "AI를 통해 배우고 싶은 것",
      description: "기획부터 배포까지, 혼자서도 한 바퀴.",
      link: "",
    },
    {
      image: "/images/card-03-page.webp",
      page: "/pages/page-03.html",
      title: "교육을 통해 이루고 싶은 목표",
      description: "AI로 직접 만드는 능력, 나만의 에이전트 팀 놈놈놈",
      link: "",
    },
    {
      image: "/images/card-04-page.webp",
      page: "/pages/page-04.html",
      title: "내 아이덴티티가 들어간 의류 쇼핑몰",
      description: "이 과정에서 배운 것의 집약체",
      link: "",
    },
    {
      image: "/images/card-05-page.webp",
      page: "/pages/page-05.html",
      title: "전투력 측정기",
      description: "드래곤볼 스카우터로 재는 운동 전투력",
      link: "",
    },
    {
      image: "/images/card-06-page.webp",
      page: "/pages/page-06.html",
      title: "돼이타베이스",
      description: "맛집 기록, 입맛이 비슷한 유저 팔로우",
      link: "",
    },
    {
      image: "/images/card-07-page.webp",
      page: "/pages/page-07.html",
      title: "포트폴리오",
      description: "작업을 쌓아온 창고, 3D 포트폴리오",
      link: "",
    },
    {
      image: "/images/card-08-page.webp",
      page: "/pages/page-08.html",
      title: "README",
      description: "이 홈페이지를 만든 방법",
      link: "",
    },
    // 9~20번 카드: 화면에서 숨김 (다시 보이려면 아래 주석을 해제)
    // { image: "/images/card-09.png", title: "The Lodge", link: "/projects/the-lodge" },
    // { image: "/images/card-10.png", title: "XYLO", link: "/projects/xylo" },
    // { image: "/images/card-11.png", title: "1 St. Paul’s Place", link: "/projects/1-st-pauls-place" },
    // { image: "/images/card-12.png", title: "Society Studios", link: "/projects/society-studios" },
    // { image: "/images/card-13.png", title: "The Wild Hare", link: "/projects/the-wild-hare" },
    // { image: "/images/card-14.png", title: "Bark", link: "/projects/bark" },
    // { image: "/images/card-15.png", title: "Prospect House", link: "/projects/prospect-house" },
    // { image: "/images/card-16.png", title: "A Touch Of Ink", link: "/projects/a-touch-of-ink" },
    // { image: "/images/card-17.png", title: "Bark", link: "/projects/bark" },
    // { image: "/images/card-18.png", title: "Live Nation", link: "/projects/live-nation" },
    // { image: "/images/card-19.png", title: "Society Studios", link: "/projects/society-studios" },
    // { image: "/images/card-20.png", title: "XYLO", link: "/projects/xylo" },
  ],
}
