import { cleanParams, http } from './http';
import type { PageResponse } from '../types/api';

/** Codes are stable (API and old links); labels and page addresses are what readers see. */
export type BlogCategory = 'ADMISSIONS' | 'BOARDING_SCHOOLS' | 'GOVERNMENT_SCHOOLS' | 'ENTRANCE_EXAMS' | 'EDUCATION_NEWS' | 'PARENTING_TIPS'
  | 'BOARD_COMPARISON' | 'SCHOOL_REVIEWS' | 'FEES_SCHOLARSHIPS';

export interface BlogCategoryInfo {
  code: BlogCategory;
  label: string;
  slug: string;
  /** One line for category cards and pages. */
  blurb: string;
  icon: 'calendar' | 'home' | 'shield' | 'graduation' | 'info' | 'users' | 'book' | 'scale' | 'rupee';
}

export const BLOG_CATEGORY_INFO: BlogCategoryInfo[] = [
  { code: 'ADMISSIONS', label: 'School Admissions', slug: 'school-admissions', icon: 'calendar', blurb: 'Admission steps, age rules, documents and timelines, from nursery to Class XI.' },
  { code: 'BOARDING_SCHOOLS', label: 'Boarding Schools', slug: 'boarding-schools', icon: 'home', blurb: 'Choosing a boarding school, hostel life, safety and admissions.' },
  { code: 'GOVERNMENT_SCHOOLS', label: 'Government Schools', slug: 'government-schools', icon: 'shield', blurb: 'Navodaya, Sainik, EMRS, Kendriya Vidyalaya and state schools explained.' },
  { code: 'ENTRANCE_EXAMS', label: 'Entrance Examinations', slug: 'entrance-exams', icon: 'graduation', blurb: 'JNVST, AISSEE, Netarhat and other school entrance tests: syllabus and preparation.' },
  { code: 'EDUCATION_NEWS', label: 'Education News and Updates', slug: 'education-news', icon: 'info', blurb: 'Board and government announcements, checked against the original notice.' },
  { code: 'PARENTING_TIPS', label: 'Parenting and Child Development', slug: 'parenting', icon: 'users', blurb: 'Study habits, screen time, well-being and working with teachers.' },
  { code: 'BOARD_COMPARISON', label: 'Academic Guidance', slug: 'academic-guidance', icon: 'book', blurb: 'Boards, curricula, subject choices and how children learn.' },
  { code: 'SCHOOL_REVIEWS', label: 'School Reviews and Comparisons', slug: 'school-comparisons', icon: 'scale', blurb: 'How to compare schools: boards, facilities, day or boarding, government or private.' },
  { code: 'FEES_SCHOLARSHIPS', label: 'Fees and Scholarships', slug: 'fees-and-scholarships', icon: 'rupee', blurb: 'Understanding school fees, concessions and scholarships.' },
];

export const BLOG_CATEGORIES: [BlogCategory, string][] = BLOG_CATEGORY_INFO.map((c) => [c.code, c.label]);
export const blogCategoryLabel = (c: BlogCategory) => BLOG_CATEGORY_INFO.find((x) => x.code === c)?.label ?? c;
export const blogCategoryBySlug = (slug: string) => BLOG_CATEGORY_INFO.find((x) => x.slug === slug);
export const blogCategoryPath = (c: BlogCategory) => `/blog/category/${BLOG_CATEGORY_INFO.find((x) => x.code === c)?.slug ?? ''}`;

export type BlogStatus = 'DRAFT' | 'FACT_CHECK' | 'REVIEW' | 'APPROVED' | 'PUBLISHED';
export const BLOG_STATUSES: [BlogStatus, string][] = [
  ['DRAFT', 'Draft'], ['FACT_CHECK', 'Fact check'], ['REVIEW', 'Editorial review'], ['APPROVED', 'Approved'], ['PUBLISHED', 'Published'],
];

export interface BlogCard {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string;
  publishedAt: string;
  minutesToRead: number;
  tags: string[];
  featured: boolean;
  /** Paid content; always shown with a "Sponsored" label. */
  sponsored: boolean;
  /** The day the facts were last checked against the sources. */
  lastReviewedOn: string | null;
}

export interface BlogSource {
  title: string;
  url: string;
  checkedOn: string | null;
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogArticle {
  card: BlogCard;
  body: string;
  authorBio: string | null;
  updatedAt: string;
  related: BlogCard[];
  sources: BlogSource[];
  faqs: BlogFaq[];
  /** The article published just before / after this one. */
  previous: BlogCard | null;
  next: BlogCard | null;
}

export interface BlogTopic {
  tag: string;
  articles: number;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  authorBio: string;
  metaTitle: string;
  metaDescription: string;
  published: boolean;
  status: BlogStatus;
  /** ISO time; a future time schedules a published post. Empty: publish now. */
  publishAt: string | null;
  featured: boolean;
  sponsored: boolean;
  tags: string[];
  lastReviewedOn: string | null;
  sources: BlogSource[];
  faqs: BlogFaq[];
}

export interface AdminBlogPost extends Omit<BlogPostInput, 'coverImageUrl' | 'coverImageAlt' | 'authorBio' | 'metaTitle' | 'metaDescription' | 'publishAt'> {
  id: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorBio: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export const blogService = {
  list: (params: { q?: string; category?: string; tag?: string; featured?: boolean; page?: number; size?: number }) =>
    http.get<PageResponse<BlogCard>>('/blog/posts', { params: cleanParams(params) }).then((r) => r.data),
  article: (slug: string) => http.get<BlogArticle>(`/blog/posts/${encodeURIComponent(slug)}`).then((r) => r.data),
  topics: () => http.get<BlogTopic[]>('/blog/posts/topics').then((r) => r.data),
  categories: () => http.get<Partial<Record<BlogCategory, number>>>('/blog/posts/categories').then((r) => r.data),
};

export const adminBlogService = {
  list: (page = 0) => http.get<PageResponse<AdminBlogPost>>('/admin/blog/posts', { params: { page } }).then((r) => r.data),
  create: (body: BlogPostInput) => http.post<AdminBlogPost>('/admin/blog/posts', body).then((r) => r.data),
  update: (id: number, body: BlogPostInput) => http.put<AdminBlogPost>(`/admin/blog/posts/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/admin/blog/posts/${id}`).then((r) => r.data),
};
