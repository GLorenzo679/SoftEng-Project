# Project Estimation - CURRENT
Date: 28/04/2023

Version: V1

# Estimation approach

Consider the EZWallet  project in CURRENT version (as received by the teachers), assume that you are going to develop the project INDEPENDENT of the deadlines of the course

# Estimate by size

|             | Estimate                        |             
| ----------- | ------------------------------- |  
| NC =  Estimated number of classes to be developed   | 4                           |             
| A = Estimated average size per class, in LOC       | 177                           | 
| S = Estimated size of project, in LOC (= NC * A) | 708 |
| E = Estimated effort, in person hours (here use productivity 10 LOC per person hour)  | 70                                   |   
| C = Estimated cost, in euro (here use 1 person hour cost = 30 euro) | 2100 | 
| Estimated calendar time, in calendar weeks (Assume team of 4 people, 8 hours per day, 5 days per week ) | 0.5              |               

# Estimate by product decomposition

|         component name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
| requirement document    | 10 |
| GUI prototype | 6 |
| design document | 10 |
| code | 30 |
| unit tests | 30 |
| api tests | 20 |
| management documents  | 16 |

# Estimate by activity decomposition

|         Activity name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
| requirements plan | 16 |
| requirements validation | 4 |
| architecture definition | 8 |
| module design | 10 |
| interface design | 5 |
| documentation | 10 |
| developmentd enviroment configuration | 15 |
| coding modules | 20 |
| test plan | 5 |
| unit test | 25 |
| system test | 15 |

# Gantt chart

| ID |        Activity name    | Duration (Day)   | Start Finish | Predecessor |            
| ---- | ------- | ------- | ------- | ----------------- | 
| 1 | requirements plan | 1 | 03/04  03/04 | |
| 2 | requirements validation | 1 | 03/04  03/04 | 1 |
| 3 | architecture definition | 1 | 04/04  04/04 | 2 |
| 4 | module design | 1 | 04/04  04/04 | 2 |
| 5 | interface design | 1 | 04/04  04/04 | 2 |
| 6 | documentation | 1 | 05/04  05/04 | 3, 4, 5 |
| 7 | developmentd enviroment configuration | 1 | 05/04  05/04 | 3, 4, 5 |
| 8 | coding modules | 1 | 06/04  06/04 | 6, 7 |
| 9 | test plan | 1 | 03/04  03/04 | |
| 10 | unit test | 2 | 04/04  05/04 | 9 |
| 11 | system test | 1 | 07/04  07/04 | 8, 10 |

![](./assets/estimation_v1/gant_chart.png)

# Summary

|             | Estimated effort                        |   Estimated duration |          
| ----------- | ------------------------------- | ---------------|
| estimate by size | 70 | 0.5 |
| estimate by product decomposition | 122 | 1 |
| estimate by activity decomposition | 132 | 1 |

The estimate based on code size is shorter because it doesn't take into account all aspect of activities necessary to complete the project. The others esimates take into account more factor such as planning, design, documentation, ecc, resulting in an higher effort estimate.




