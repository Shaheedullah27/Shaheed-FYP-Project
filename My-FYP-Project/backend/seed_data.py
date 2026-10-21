"""
Seed Script for AI ResumeMatch SQLite Database
Pre-populates the database with benchmark student & professional comparisons.
"""

from database import init_db, save_analysis
from nlp_engine import analyze_full

SAMPLE_RESUME_TEXT = """ALEX CHEN
Full Stack Software Engineer
alex.chen@example.com | San Francisco, CA | github.com/alexchen

SUMMARY:
Results-driven Full Stack Software Engineer with expertise in modern web development, TypeScript, React, and Node.js. Experienced in RESTful APIs, PostgreSQL schemas, and Docker containerization.

SKILLS:
Languages: JavaScript, TypeScript, Python, HTML5, CSS3, SQL
Frameworks: React, Node.js, Express.js, Next.js, Redux, Tailwind CSS
Databases: PostgreSQL, MongoDB, Redis, SQLite
Cloud & Tools: Docker, AWS (S3, EC2), Linux, Git, CI/CD, Unit Testing (Jest), Agile

EXPERIENCE:
Software Engineering Intern | TechFlow Solutions | June 2024 - Sept 2024
- Built responsive dashboard components with React and TypeScript.
- Developed scalable REST APIs using Node.js and Express for order processing.
- Optimized PostgreSQL database queries, reducing response latency by 70%.
- Achieved 88% unit test coverage using Jest.
"""

SAMPLE_JD_TEXT = """Job Title: Full Stack Software Engineer
Company: Acme SaaS Inc.
Location: San Francisco, CA

RESPONSIBILITIES:
- Build modern responsive user interfaces using React, TypeScript, and Tailwind CSS.
- Develop scalable backend RESTful APIs with Node.js and Express.js.
- Maintain and optimize PostgreSQL database schemas and complex queries.
- Containerize application services using Docker and manage CI/CD pipelines.
- Collaborate across engineering teams using Git and Agile Scrum methodologies.

REQUIREMENTS:
- Proficient in TypeScript, JavaScript, HTML5, and CSS3.
- Demonstrated experience with React, Node.js, and Express.
- Experience with PostgreSQL and SQL database design.
- Familiarity with Docker and Git version control.
"""

def seed():
    print("Initializing SQLite database...")
    init_db()
    
    print("Running initial NLP analysis for sample data...")
    result = analyze_full(SAMPLE_RESUME_TEXT, SAMPLE_JD_TEXT, "Alex Chen — Full Stack Engineer", "Full Stack Software Engineer")
    result['id'] = "analysis-seed-001"
    result['timestamp'] = "2026-10-18 14:32"
    result['candidate_name'] = "Alex Chen"
    result['company_name'] = "Acme SaaS Inc."
    
    save_analysis(result)
    print("Successfully seeded benchmark analysis 'analysis-seed-001' into resumematch.db!")

if __name__ == '__main__':
    seed()
