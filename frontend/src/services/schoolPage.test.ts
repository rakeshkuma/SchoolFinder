import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('./http', () => ({ http: { get }, cleanParams: (p: unknown) => p }));

import { schoolService } from './publicApi';

const page = {
  school: { id: 7, slug: 'test-school', name: 'Test School' },
  images: [{ id: 1 }],
  fees: [],
  admissions: [{ id: 2 }],
  faqs: [{ question: 'Q', answer: 'A' }],
  ranking: { schoolId: 7, status: 'NOT_YET_RANKED', siteRanking: null, externalRankings: [], disclaimer: 'd' },
};

describe("a school profile's first view", () => {
  beforeEach(() => get.mockReset());

  it('comes in one request, and the sections that ask for its parts are answered without another', async () => {
    get.mockResolvedValueOnce({ data: page });
    await expect(schoolService.page('test-school')).resolves.toEqual(page.school);
    expect(get).toHaveBeenCalledWith('/schools/slug/test-school/page');
    await expect(schoolService.images(7)).resolves.toEqual(page.images);
    await expect(schoolService.fees(7)).resolves.toEqual(page.fees);
    await expect(schoolService.admissions(7)).resolves.toEqual(page.admissions);
    await expect(schoolService.faqs(7)).resolves.toEqual(page.faqs);
    await expect(schoolService.ranking(7)).resolves.toEqual(page.ranking);
    // A second section asking for the same part (two ranking cards) is answered too.
    await expect(schoolService.ranking(7)).resolves.toEqual(page.ranking);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('asks the server for another school, and again once a minute has passed', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    get.mockResolvedValueOnce({ data: { ...page, school: { ...page.school, id: 8 } } });
    await schoolService.page('other-school');
    get.mockResolvedValue({ data: [{ id: 99 }] });
    await expect(schoolService.fees(9)).resolves.toEqual([{ id: 99 }]);
    expect(get).toHaveBeenLastCalledWith('/schools/9/fees');
    await schoolService.fees(8);
    expect(get).toHaveBeenCalledTimes(2);
    now.mockReturnValue(1_000_000 + 60_001);
    await schoolService.fees(8);
    expect(get).toHaveBeenLastCalledWith('/schools/8/fees');
    expect(get).toHaveBeenCalledTimes(3);
    now.mockRestore();
  });
});
