# Admin Interface Mockups

## 1) Global Admin Shell
```
+---------------------------------------------------------------+
| Sidebar (fixed)                 | Topbar (mobile)            |
| - Dashboard                     | [menu] Page title          |
| - Subjects                      |                            |
| - Posts                         |                            |
| - Logout                        |                            |
+----------------------------------+----------------------------+
| Main Content Area                                            |
| - Dashboard / Subjects / Posts route content                |
+---------------------------------------------------------------+
```

## 2) Dashboard Main Page
```
+---------------------------------------------------------------+
| HERO: "Performance Dashboard"                                |
| [Live Insight pill]  Text summary     [Line Graph 14 days]   |
| KPI mini stats                                                |
+---------------------------------------------------------------+
| Overview Cards (4): Subjects | Posts | Recent Uploads | Users |
+---------------------------------------------------------------+
| Analytics Row: [Bar Chart] [Doughnut Chart]                  |
+---------------------------------------------------------------+
| Quick Actions                                                 |
+---------------------------------------------------------------+
| Visitors & Locations list                                    |
+---------------------------------------------------------------+
```

## 3) Subject Management (Header-Only Upload)
```
+---------------------------------------------------------------+
| Subjects                                     [Add Subject]    |
+---------------------------------------------------------------+
| Table: Subject | Actions                                      |
+---------------------------------------------------------------+
| Modal                                                        X |
| - Subject Name                                                |
| - Header Image Upload (16:9)                                  |
| - Header Preview Card                                         |
| [Create/Update] [Cancel]                                      |
+---------------------------------------------------------------+
```

## 4) Posts Management
```
+---------------------------------------------------------------+
| Filters Bar (Subject/Semester/Grade/Type/Status) [count]     |
+---------------------------------------------------------------+
| Posts Table                                                   |
+---------------------------------------------------------------+
| Modal (Add/Edit Post)                                         |
| - Basic Info + AI assist                                      |
| - Categorization                                              |
| - Attachments (dropzone/files/folder/links)                  |
| - Publish toggle                                              |
| Footer actions                                                |
+---------------------------------------------------------------+
```

## Responsive Rules
- <= 1024px: sidebar becomes drawer with overlay.
- <= 900px: modal form grids collapse to single-column.
- <= 768px: content padding reduced; dashboard hero stacks into one column.
