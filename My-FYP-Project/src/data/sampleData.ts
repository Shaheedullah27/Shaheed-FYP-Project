import { SampleDocument, HistoryItem } from '../types';

export const SAMPLE_RESUMES: SampleDocument[] = [
  {
    id: 'resume-fullstack',
    title: 'Alex Chen — Full Stack Software Engineer',
    subtitle: 'B.S. Computer Science Graduate, React, Node.js, TypeScript, PostgreSQL',
    role: 'Full Stack Engineer',
    skillsCount: 18,
    text: `ALEX CHEN
Full Stack Software Engineer
alex.chen@example.com | (555) 234-5678 | San Francisco, CA | github.com/alexchen | linkedin.com/in/alexchen

PROFESSIONAL SUMMARY
Results-driven Full Stack Software Engineer with a solid foundation in modern web development, TypeScript, React, and Node.js. Experienced in designing RESTful APIs, relational database schemas with PostgreSQL, and deploying microservices using Docker and CI/CD pipelines. Strong problem-solving abilities and collaborative agile mindset.

TECHNICAL SKILLS
• Programming Languages: JavaScript, TypeScript, Python, HTML5, CSS3, SQL
• Frameworks & Libraries: React, Node.js, Express.js, Next.js, Redux, Tailwind CSS
• Databases: PostgreSQL, MongoDB, Redis, SQLite
• Cloud & DevOps: Docker, AWS (S3, EC2), Linux, Git, GitHub Actions, CI/CD
• Methodologies & Tools: REST APIs, Agile / Scrum, Unit Testing (Jest), Postman, Jira

PROFESSIONAL EXPERIENCE
Software Engineering Intern | TechFlow Solutions | June 2024 – September 2024
• Built responsive user dashboard components using React and TypeScript, increasing user session engagement by 24%.
• Developed scalable REST APIs with Node.js and Express to process customer order tracking data.
• Optimized PostgreSQL query execution plans, reducing average response latency from 320ms to 95ms.
• Implemented automated unit tests with Jest, achieving 88% test coverage across core payment modules.
• Participated in daily agile stand-ups, two-week sprint planning, and peer code reviews.

KEY PROJECTS
Real-time Collaborative Task Board | TypeScript, React, Express, PostgreSQL, Docker
• Architected a full-stack project management application with real-time updates and team permissions.
• Implemented role-based access control (RBAC) and JWT authentication.
• Containerized frontend and backend services using Docker and configured CI/CD via GitHub Actions.

E-Commerce Inventory Microservice | Python, FastAPI, Redis, MongoDB
• Designed an asynchronous catalog service supporting 5,000 requests/sec with Redis caching.
• Built automated data migration pipelines and schema validation.

EDUCATION
Bachelor of Science in Computer Science | State University | Graduated May 2024
• Relevant Coursework: Data Structures & Algorithms, Database Systems, Web Architecture, Software Engineering Principles`
  },
  {
    id: 'resume-data-ml',
    title: 'Priya Sharma — Junior AI & Data Scientist',
    subtitle: 'M.S. Data Science, Python, Scikit-Learn, PyTorch, Pandas, SQL',
    role: 'Data Scientist / ML Engineer',
    skillsCount: 20,
    text: `PRIYA SHARMA
Data Scientist & Machine Learning Specialist
priya.sharma@example.com | (555) 987-6543 | New York, NY | github.com/priyasharma

SUMMARY
Analytical Data Scientist with hands-on experience developing statistical machine learning models, natural language processing pipelines, and predictive analytics in Python. Skilled in Scikit-Learn, PyTorch, Pandas, SQL, and data visualization. Proven track record in feature engineering, hyperparameter tuning, and deploying ML models.

CORE COMPETENCIES
• Languages: Python, SQL, R, Bash
• Machine Learning & NLP: Scikit-Learn, PyTorch, TensorFlow, TF-IDF, Word2Vec, Pandas, NumPy
• Databases: PostgreSQL, SQLite, MongoDB
• Tools & Visualization: Git, Docker, Jupyter Notebook, Linux, Tableau
• Soft Skills: Analytical Problem Solving, Technical Communication, Critical Thinking

EXPERIENCE
Machine Learning Research Assistant | Data Intelligence Lab | Sep 2023 – Present
• Developed an NLP pipeline to classify academic abstracts using Scikit-Learn TF-IDF vectorization and Logistic Regression, achieving 91.4% F1-score.
• Conducted Exploratory Data Analysis (EDA) on over 200,000 tabular records with Pandas and NumPy.
• Fine-tuned PyTorch neural network architectures for anomaly detection in sensor telemetry data.
• Wrote clear documentation and shared findings at department meetings every two weeks.

PROJECTS
Explainable Resume & Job Matching Algorithm | Python, Scikit-Learn, Streamlit, SQLite
• Built a tool that compares resumes with job postings and explains how their wording matches.
• Built TF-IDF keyword extraction and skill gap detection across 5 distinct job categories.

Customer Churn Prediction Engine | Python, Scikit-Learn, Docker
• Trained gradient boosting and random forest models to predict customer subscription cancellation.
• Deployed REST endpoint for real-time model inference containerized via Docker.

EDUCATION
Master of Science in Data Science | City University | Dec 2024
Bachelor of Science in Statistics & Mathematics | May 2022`
  },
  {
    id: 'resume-devops',
    title: 'Marcus Vance — Cloud & DevOps Specialist',
    subtitle: 'AWS, Kubernetes, Docker, Terraform, CI/CD, Linux, Python',
    role: 'DevOps / Cloud Engineer',
    skillsCount: 19,
    text: `MARCUS VANCE
Cloud & DevOps Engineer
marcus.vance@example.com | (555) 456-7890 | Austin, TX | linkedin.com/in/marcusvance

SUMMARY
DevOps and Cloud Infrastructure Engineer specializing in infrastructure automation, container orchestration, and continuous integration/continuous deployment (CI/CD) on AWS. Experienced with Terraform, Kubernetes, Docker, and Linux systems administration.

SKILLS & CERTIFICATIONS
• Cloud Platforms: AWS (EC2, S3, RDS, IAM, CloudWatch, EKS), Google Cloud Platform
• Infrastructure as Code & Orchestration: Terraform, Kubernetes, Docker, Helm
• CI/CD & Automation: GitHub Actions, Jenkins, Git, Bash scripting, Python
• Systems: Linux (Ubuntu, RedHat), Nginx, Microservices Architecture
• Monitoring: Prometheus, Grafana, ELK Stack

PROFESSIONAL EXPERIENCE
Associate DevOps Engineer | CloudScale Systems | Jan 2023 – Present
• Automated provisioning of 15+ AWS cloud environments using Terraform infrastructure as code (IaC).
• Migrated monolithic web services into multi-container Docker applications running on Kubernetes (EKS).
• Reduced deployment pipeline execution time by 42% through optimized GitHub Actions caching strategies.
• Configured Nginx reverse proxies and SSL certificates for secure HTTPS routing.

EDUCATION
B.S. in Information Technology & Systems | University of Texas | 2022`
  }
];

export const SAMPLE_JOB_DESCRIPTIONS: SampleDocument[] = [
  {
    id: 'jd-fullstack',
    title: 'Senior / Mid-Level Full Stack Engineer',
    subtitle: 'Acme SaaS Inc. — React, Node.js, TypeScript, PostgreSQL, Docker, AWS',
    role: 'Full Stack Engineer',
    skillsCount: 16,
    text: `Job Title: Full Stack Software Engineer
Company: Acme SaaS Inc.
Location: San Francisco, CA (Hybrid)
Employment Type: Full-time

ABOUT THE ROLE:
Acme SaaS is looking for a talented Full Stack Software Engineer to help build the next generation of our collaborative enterprise workspace platform. You will work on user-facing features using React and TypeScript while scaling backend REST APIs and microservices using Node.js, Express, and PostgreSQL.

KEY RESPONSIBILITIES:
• Design, implement, and maintain responsive web applications using React, TypeScript, and modern CSS frameworks like Tailwind CSS.
• Build reliable, high-throughput RESTful backend APIs with Node.js and Express.js.
• Design efficient database schemas, write optimized SQL queries, and manage migrations in PostgreSQL.
• Collaborate with product managers and designers using Figma and Agile / Scrum methodologies.
• Maintain Docker container configurations and deploy services to AWS cloud infrastructure using CI/CD pipelines.
• Write clear code and test it with Jest.

REQUIRED QUALIFICATIONS:
• 2+ years of professional software engineering experience or equivalent project portfolio.
• Strong proficiency in TypeScript, JavaScript, HTML5, and CSS3.
• Demonstrated production experience with React and state management.
• Deep understanding of backend engineering with Node.js, Express, and REST APIs.
• Strong database experience with PostgreSQL or MySQL.
• Experience with Git version control, Docker containers, and CI/CD workflows.
• Excellent analytical problem-solving and team collaboration skills.

PREFERRED QUALIFICATIONS:
• Familiarity with AWS services (S3, EC2, Lambda).
• Experience with Redis caching and microservices architecture.
• Knowledge of Python or GraphQL is a plus.`
  },
  {
    id: 'jd-data-ml',
    title: 'Junior Machine Learning / Data Scientist',
    subtitle: 'Cognitive Insights — Python, Scikit-Learn, PyTorch, SQL, NLP, Docker',
    role: 'Data Scientist / ML Engineer',
    skillsCount: 17,
    text: `Job Title: Junior Machine Learning Engineer / Data Scientist
Company: Cognitive Insights Labs
Location: Remote / New York, NY
Employment Type: Full-time

ROLE OVERVIEW:
Cognitive Insights is seeking a Junior Machine Learning Engineer to contribute to our explainable predictive intelligence products. You will build end-to-end data pipelines, train machine learning models, and analyze unstructured textual data using natural language processing (NLP).

RESPONSIBILITIES:
• Develop, validate, and deploy statistical and machine learning models using Python and Scikit-Learn.
• Build natural language processing (NLP) pipelines utilizing TF-IDF, n-gram tokenization, and cosine similarity.
• Perform exploratory data analysis and feature engineering on structured and unstructured datasets using Pandas and NumPy.
• Write complex SQL queries to extract and transform data from PostgreSQL and SQLite data warehouses.
• Containerize machine learning inference workloads using Docker and deploy to Linux cloud servers.
• Work with software and product teams to turn business needs into automated solutions.

REQUIREMENTS:
• Bachelor's or Master's degree in Computer Science, Data Science, Statistics, or related STEM discipline.
• High proficiency in Python and standard data science libraries (Pandas, NumPy, Scikit-Learn).
• Strong conceptual and practical foundation in machine learning, regression, classification, and clustering.
• Solid understanding of SQL and relational database modeling.
• Hands-on familiarity with Git version control and Linux environments.
• Excellent critical thinking and written/verbal communication skills.

NICE TO HAVE:
• Experience with deep learning frameworks such as PyTorch or TensorFlow.
• Experience building REST API wrappers (FastAPI or Flask) for model serving.
• Familiarity with cloud platforms (AWS or GCP).`
  },
  {
    id: 'jd-devops',
    title: 'Cloud DevOps Engineer',
    subtitle: 'Nexlify Cloud — AWS, Kubernetes, Terraform, Docker, CI/CD, Python',
    role: 'DevOps / Cloud Engineer',
    skillsCount: 18,
    text: `Job Title: Cloud & DevOps Engineer
Company: Nexlify Cloud Solutions
Location: Austin, TX
Employment Type: Full-time

ABOUT US:
Nexlify is expanding our Site Reliability & Infrastructure team to scale our multi-region cloud platform.

RESPONSIBILITIES:
• Manage and automate AWS infrastructure using Terraform and Infrastructure as Code (IaC).
• Build, scale, and maintain containerized microservices on Kubernetes clusters (EKS) and Docker.
• Develop and optimize CI/CD pipelines with GitHub Actions for automated testing and zero-downtime deployment.
• Monitor system health, performance metrics, and logs with Prometheus, Grafana, and Linux tooling.
• Write automation scripts in Python and Bash to streamline operational workflows.

QUALIFICATIONS:
• In-depth hands-on experience with AWS services (EC2, S3, RDS, IAM, VPC, EKS).
• Strong competence with Kubernetes orchestration and Docker containers.
• Proven expertise with Terraform for automated infrastructure provisioning.
• Proficiency in Linux systems administration and Bash or Python scripting.
• Strong understanding of CI/CD continuous integration practices and Git.
• Solid communication and problem-solving skills in high-availability environments.`
  }
];

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'hist-1',
    timestamp: '2026-10-18 14:32',
    resumeTitle: 'Alex Chen — Full Stack Software Engineer',
    candidateName: 'Alex Chen',
    jobTitle: 'Senior / Mid-Level Full Stack Engineer',
    companyName: 'Acme SaaS Inc.',
    overallScore: 84,
    cosineSimilarity: 82.5,
    atsScore: 88,
    matchedSkillCount: 14,
    missingSkillCount: 3,
    topMissingSkill: 'AWS'
  },
  {
    id: 'hist-2',
    timestamp: '2026-10-17 11:15',
    resumeTitle: 'Priya Sharma — Junior AI & Data Scientist',
    candidateName: 'Priya Sharma',
    jobTitle: 'Junior Machine Learning / Data Scientist',
    companyName: 'Cognitive Insights Labs',
    overallScore: 89,
    cosineSimilarity: 87.2,
    atsScore: 92,
    matchedSkillCount: 15,
    missingSkillCount: 2,
    topMissingSkill: 'FastAPI'
  },
  {
    id: 'hist-3',
    timestamp: '2026-10-15 09:40',
    resumeTitle: 'Alex Chen — Full Stack Software Engineer',
    candidateName: 'Alex Chen',
    jobTitle: 'Cloud DevOps Engineer',
    companyName: 'Nexlify Cloud Solutions',
    overallScore: 56,
    cosineSimilarity: 54.0,
    atsScore: 78,
    matchedSkillCount: 7,
    missingSkillCount: 11,
    topMissingSkill: 'Kubernetes'
  }
];
