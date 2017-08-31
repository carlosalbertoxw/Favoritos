import { FavoritosPage } from './app.po';

describe('favoritos App', function() {
  let page: FavoritosPage;

  beforeEach(() => {
    page = new FavoritosPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
