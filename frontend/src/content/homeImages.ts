/**
 * Photographs on the home page: each is used under its licence (Creative Commons, public domain or the Unsplash License)
 * and credited in the page's "Photo credits". Files are resized copies in public/images/home (WebP, built from the
 * originals linked here). Pictures of a named school show that school; the others are illustrations, not of any school
 * listed here.
 */
export interface HomeImage {
  srcSet: string; src: string; width: number; height: number; alt: string;
  credit: string; licence: string; licenceUrl: string | null; sourceUrl: string;
}

export const HOME_IMAGES = {
  'hero-campus': {
    srcSet: '/images/home/hero-campus-960.webp 960w, /images/home/hero-campus-1600.webp 1600w',
    src: '/images/home/hero-campus-960.webp', width: 1600, height: 988,
    alt: "A school campus in India with the national flag, students at morning assembly and a bright blue sky",
    credit: "Advaithacademy / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Capital_Campus_-_with_students_and_staff.jpg",
  },
  'hero-students': {
    srcSet: '/images/home/hero-students-480.webp 480w, /images/home/hero-students-720.webp 720w',
    src: '/images/home/hero-students-480.webp', width: 720, height: 482,
    alt: "Smiling Indian schoolboys in blue school uniforms",
    credit: "Akshar Dave / Unsplash", licence: "Unsplash License", licenceUrl: "https://unsplash.com/license",
    sourceUrl: "https://unsplash.com/photos/group-of-boys-wearing-blue-school-uniforms-photo-b5UILRPGV_g",
  },
  'studying': {
    srcSet: '/images/home/studying-400.webp 400w, /images/home/studying-720.webp 720w',
    src: '/images/home/studying-400.webp', width: 720, height: 405,
    alt: "Two schoolgirls in uniform writing at a desk in a classroom",
    credit: "Swastik Arora / Unsplash", licence: "Unsplash License", licenceUrl: "https://unsplash.com/license",
    sourceUrl: "https://unsplash.com/photos/two-young-girls-sitting-at-a-desk-in-a-classroom-TcKmus54ij0",
  },
  'computer-lab': {
    srcSet: '/images/home/computer-lab-400.webp 400w, /images/home/computer-lab-720.webp 720w',
    src: '/images/home/computer-lab-400.webp', width: 720, height: 540,
    alt: "Students in school uniform working at computers with their teacher in a school lab",
    credit: "RJ Raawat / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:AI_Lab_at_Dr._Rajendra_Prasad_Kendriya_Vidyalaya.jpg",
  },
  'teacher-class': {
    srcSet: '/images/home/teacher-class-400.webp 400w, /images/home/teacher-class-720.webp 720w',
    src: '/images/home/teacher-class-400.webp', width: 720, height: 449,
    alt: "Students in school uniform with their teacher outside their school",
    credit: "Byronkhiangte / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Indian_school_students_with_their_teacher_at_Hnahthial.jpg",
  },
  'calculator': {
    srcSet: '/images/home/calculator-400.webp 400w, /images/home/calculator-720.webp 720w',
    src: '/images/home/calculator-400.webp', width: 720, height: 480,
    alt: "An electronic calculator, for working out school fees",
    credit: "Coyau / Wikimedia Commons", licence: "CC BY-SA 3.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aurora_electronic_calculator_DT210_01.jpg",
  },
  'cadets': {
    srcSet: '/images/home/cadets-400.webp 400w, /images/home/cadets-720.webp 720w',
    src: '/images/home/cadets-400.webp', width: 720, height: 540,
    alt: "NCC cadets in uniform with their officers",
    credit: "S.Senthilkumar Arts / Wikimedia Commons", licence: "CC BY-SA 3.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Nccstudents.JPG",
  },
  'cadets-ceremony': {
    srcSet: '/images/home/cadets-ceremony-400.webp 400w, /images/home/cadets-ceremony-720.webp 720w',
    src: '/images/home/cadets-ceremony-400.webp', width: 720, height: 720,
    alt: "Cadets in uniform at a ceremony",
    credit: "Amanjagtap31 / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:NCC_Para_basic_course_wing_ceremony.jpg",
  },
  'bal-vidya-mandir': {
    srcSet: '/images/home/bal-vidya-mandir-400.webp 400w, /images/home/bal-vidya-mandir-686.webp 686w',
    src: '/images/home/bal-vidya-mandir-400.webp', width: 686, height: 486,
    alt: "Bal Vidya Mandir Senior Secondary School, Lucknow: school building and lawn",
    credit: "Shivam Jain Kakadia / Wikimedia Commons", licence: "CC BY-SA 3.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:BVM_Campus.jpg",
  },
  'cms-kanpur-road': {
    srcSet: '/images/home/cms-kanpur-road-400.webp 400w, /images/home/cms-kanpur-road-720.webp 720w',
    src: '/images/home/cms-kanpur-road-400.webp', width: 720, height: 540,
    alt: "City Montessori School, Kanpur Road campus, Lucknow",
    credit: "Kakubutia / Wikimedia Commons", licence: "Public domain", licenceUrl: null,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Academic_block.jpg",
  },
  'hansraj-modern': {
    srcSet: '/images/home/hansraj-modern-400.webp 400w, /images/home/hansraj-modern-720.webp 720w',
    src: '/images/home/hansraj-modern-400.webp', width: 720, height: 405,
    alt: "Mahatma Hansraj Modern School, Jhansi: main building and basketball court",
    credit: "Alanands3 / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Main_building_after_major_renovation.jpg",
  },
  'mayo-college': {
    srcSet: '/images/home/mayo-college-400.webp 400w, /images/home/mayo-college-600.webp 600w',
    src: '/images/home/mayo-college-400.webp', width: 600, height: 450,
    alt: "Mayo College, Ajmer: the main building",
    credit: "Singh92karan / Wikimedia Commons", licence: "CC BY-SA 3.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mayo_college_in_a_sunny_day.jpg",
  },
  'modern-school': {
    srcSet: '/images/home/modern-school-400.webp 400w, /images/home/modern-school-650.webp 650w',
    src: '/images/home/modern-school-400.webp', width: 650, height: 433,
    alt: "Modern School, Barakhamba Road, New Delhi: building and lawn",
    credit: "Manank / Wikimedia Commons", licence: "Public domain", licenceUrl: null,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ig-building-pic2.jpg",
  },
  'netarhat': {
    srcSet: '/images/home/netarhat-400.webp 400w',
    src: '/images/home/netarhat-400.webp', width: 400, height: 300,
    alt: "Netarhat Awasiya Vidyalaya, Jharkhand: campus and garden path",
    credit: "Vikash.iitb / Wikimedia Commons", licence: "Public domain", licenceUrl: null,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Netarhat_School.jpg",
  },
  'jnv-rangareddy': {
    srcSet: '/images/home/jnv-rangareddy-400.webp 400w, /images/home/jnv-rangareddy-720.webp 720w',
    src: '/images/home/jnv-rangareddy-400.webp', width: 720, height: 540,
    alt: "PM SHRI Jawahar Navodaya Vidyalaya, Rangareddy: school buildings",
    credit: "Satti.Naveen(Lingampally)(Batch 1998-2005) / Wikimedia Commons", licence: "CC BY 3.0", licenceUrl: "https://creativecommons.org/licenses/by/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:JNV_Gachibowli.jpg",
  },
  'kv-hebbal': {
    srcSet: '/images/home/kv-hebbal-400.webp 400w, /images/home/kv-hebbal-640.webp 640w',
    src: '/images/home/kv-hebbal-400.webp', width: 640, height: 480,
    alt: "PM SHRI Kendriya Vidyalaya, Hebbal, Bengaluru: campus with the national flag",
    credit: "Souravmohanty2005 / Wikimedia Commons", licence: "CC BY 3.0", licenceUrl: "https://creativecommons.org/licenses/by/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:KVH_Campus.jpg",
  },
  'sainik-tilaiya': {
    srcSet: '/images/home/sainik-tilaiya-400.webp 400w, /images/home/sainik-tilaiya-494.webp 494w',
    src: '/images/home/sainik-tilaiya-400.webp', width: 494, height: 335,
    alt: "Sainik School Tilaiya, Jharkhand: view over the campus",
    credit: "Wikiditot / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sainik_school_tilaiya.jpg",
  },
  'sainik-ghorakhal': {
    srcSet: '/images/home/sainik-ghorakhal-400.webp 400w, /images/home/sainik-ghorakhal-640.webp 640w',
    src: '/images/home/sainik-ghorakhal-400.webp', width: 640, height: 640,
    alt: "The hills around Sainik School Ghorakhal, Nainital",
    credit: "Twbnrftw / Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:View_of_Bhimtal_Lake_from_Sainik_School_Ghorakhal.jpg",
  },
} satisfies Record<string, HomeImage>;

export type HomeImageId = keyof typeof HOME_IMAGES;
