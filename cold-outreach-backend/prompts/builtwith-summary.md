# WEBSITE TECH STACK SUMMARY GENERATOR

Analyze and summarize the technologies used on a website based on data scraped from [BuiltWith.com](https://builtwith.com). The output should clearly communicate the website’s **technical landscape**, **digital maturity**, and **potential areas of improvement or modernization**.

## OBJECTIVE

Create a human-readable summary of the website’s technology stack that is suitable for technical consultants, sales teams, or internal documentation. The summary should:

- Provide an overview of the key technologies powering the site
- Identify the purpose and function of those technologies
- Assess the digital maturity level
- Highlight modern tools vs outdated or missing technologies
- Recommend potential improvements or integrations

## INPUT DATA
- **BuiltWith scraped data** for a given domain, including:
  - CMS, analytics, marketing tools
  - Hosting and CDN providers
  - Programming languages and frameworks
  - Payment gateways and eCommerce platforms
  - Advertising and tracking tools
  - Widgets, chat tools, tag managers
  - SSL certificates and security layers
  - JavaScript libraries and performance optimizations
  - Any detected version numbers and technology lifecycles

## OUTPUT FORMAT

Write a **concise, paragraph-style summary** (~150–250 words) covering the following:

### 1. OVERALL TECHNOLOGY LANDSCAPE
- What kind of stack is the website using? (e.g., modern, hybrid, outdated, lightweight, enterprise-level)
- What CMS or backend platform is in place?

### 2. FRONTEND & UX TOOLS
- Key frontend frameworks or JS libraries used
- Performance tools or UI-related technologies

### 3. MARKETING & ANALYTICS TOOLS
- Analytics, CRM, retargeting, SEO, or automation tools in use
- Maturity of their marketing setup

### 4. ECOMMERCE & PAYMENT STACK (if applicable)
- Payment providers, shopping platforms, conversion tools

### 5. INFRASTRUCTURE & SECURITY
- Hosting setup, CDN providers, SSL/TLS security tools
- Any cloud infrastructure or performance optimizations

### 6. ASSESSMENT & RECOMMENDATIONS
- Are the tools modern or outdated?
- Any missing or redundant technologies?
- Brief suggestions for modernization or optimization

## STYLE & TONE
- Use a **neutral, professional tone**
- Make it readable to both technical and non-technical audiences
- Write in paragraph format (no bullet points)
- Mention **specific technologies by name**, and **categorize them** clearly

## REASONING APPROACH

When crafting the summary:
- Identify high-level categories from technology tags (CMS, marketing, frontend, etc.)
- Use version numbers and common knowledge to judge if a tool is modern or deprecated
- Compare presence of tools (e.g., no analytics, no CDN) to industry best practices
- Infer website scale and complexity based on number and depth of technologies used

## INPUT DATA BEGINS BELOW
{$BUILTWITH_RAW_MD_DATA}