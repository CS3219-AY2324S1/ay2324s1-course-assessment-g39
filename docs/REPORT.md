# PeerPrep

PeerPrep is a web application that aims to help students prepare for their interviews by providing a platform for them to practice their interview skills with their peers.

It is built using the T3 Stack (TypeScript, TailwindCSS, Next.js, tRPC, Prisma, NextAuth.js), with a PostgreSQL + MongoDB + S3 database backend, and is deployed on Kubernetes.

## Appendix 1 - Requirements

### User Profile Management

#### Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 1.1 | Users can create an account | H | Pending |
| 1.2 | Users can log in to and out of their account | H | Pending |
| 1.3 | Users can reset their password | M | Pending |
| 1.4 | Users can view the history of their past attempts in their profile | M | Pending |
| 1.5 | Users should remain logged in even after closing the browser, and be automatically logged out after some time (token authentication). | L | Pending |
| 1.6 | Users can view statistics of their past attempts in their profile, as well as a quantified 'proficiency' score. | L | Pending |
| 1.7 | Users can sign/log in using Oauth | L | Pending |


#### Non-Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 1.8 | Users can view their profile on mobile devices | H | Pending |
| 1.9 | Users can view their profile on different browsers | H | Pending |
| 1.10 | Token authentication should be secure | M | Pending |
| 1.11 | The user database must meet the requirements of the Personal Data Protection Act (PDPA) | M | Pending |
| 1.12 | The user database must meet the requirements of the General Data Protection Regulation (GDPR) | M | Pending |

### Matching Service

#### Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 2.1 | Users can select the difficulty level of the question they want to attempt | H | Pending |
| 2.2 | Users can select the topic of the question they want to attempt | H | Pending |
| 2.3 | Users can be matched with another user who has a similar proficiency level and/or selected the same difficulty level and/or topic as them | H | Pending |
| 2.4 | Users can cancel their request to find a match | H | Pending |
| 2.5 | Users can view the status of their match request | H | Pending |
| 2.6 | Users can request to be matched with a specific other user and bypass the matching algorithm | M | Pending |

#### Non-Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 2.7 | The matching algorithm should complete or time out within 30 seconds | H | Pending |
| 2.8 | The matching algorithm should be fair and unbiased with regard to the number of matches each user receives | H | Pending |

### Questions & Answers

#### Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 3.1 | User pairs are assigned a question to attempt | H | Pending |
| 3.2 | Users can view the question assigned to them | H | Pending |
| 3.3 | Users can enter their solution to the question assigned to them | H | Pending |
| 3.4 | Users can specify the language they are using to solve the question | H | Pending |
| 3.5 | Users can submit and test their solution on several test cases | H | Pending |
| 3.6 | Users can view the solution to the question assigned to them after the collaborative session is over | H | Pending |


#### Non-Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 3.7 | The question assigned to a user should be of the difficulty level and topic they selected | H | Pending |
| 3.8 | The questions should have multiple solutions in different languages | H | Pending |
| 3.9 | The questions should have multiple test cases | H | Pending |
| 3.10 | The question assigned to a user should be 'perceptively random' (i.e. they should not be assigned the same question within N attempts, where N is the number of questions in the database) | M | Pending |


### Collaboration Space

#### Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 4.1 | Users can view and edit their peers' code in real-time | H | Pending |
| 4.2 | Users can highlight, and add comments on their peers' code in real-time | H | Pending |
| 4.3 | Users can chat with their peers in real-time | H | Pending |

#### Non-Functional Requirements

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| 4.4 | The collaboration space should be usable on mobile devices | H | Pending |
| 4.5 | The collaboration space should be usable on different browsers | M | Pending |
| 4.6 | The collaboration space should support syntax highlighting | M | Pending |
| 4.7 | The collaboration space should support code completions | M | Pending |
| 4.8 | The collaboration space should support AI-powered code generation | L | Pending |

## Appendix 2 - About Us

We are a team based in the [School of Computing, National University of Singapore](http://www.comp.nus.edu.sg/).

| Name | Role | Responsibilities | Contact |
| --- | --- | --- | --- |
| Chandrasekaran Akash | Backend Developer | Database and Integrations | [GituHub](https://github.com/Enigmatrix) |
| Wang Jiefan | Frontend Developer | UI/UX | [GituHub](https://github.com/Nafeij) |
| Kai Fang | Backend Developer | Systems Design | [GituHub](https://github.com/kflim) |
| Au Chen Xi, Gabriel | Backend Developer | Model Design | [GituHub](https://github.com/Gabau) |

