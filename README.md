# Uqudo Admin Portal

![version](https://img.shields.io/badge/version-3.2.0-blue.svg) ![status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)

A comprehensive AML/KYC management system for customer onboarding, verification, and compliance monitoring. Built on Material Dashboard 3 with a complete Express.js backend.

## Features

- ✅ **Dashboard**: Real-time KPIs, verification metrics, and analytics
- ✅ **Account Management**: Customer accounts with KYC status tracking
- ✅ **Alert Management**: Priority-based alert queue with investigation workflows
- ✅ **Case Management**: AML cases with alert linking and resolution tracking
- ✅ **Blocklist Management**: Custom blocklists with CSV import
- ✅ **KYC Configuration**: Country risk settings and verification rules
- ✅ **SDK Integration**: Complete Uqudo SDK enrollment processing with background checks
- ✅ **Audit Logging**: Comprehensive activity tracking for compliance

## Technology Stack

### Frontend
- **Framework**: Bootstrap 5 (Material Dashboard 3)
- **Server**: Express.js serving static files
- **JavaScript**: Vanilla JS with modern ES6+

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT-based auth with refresh tokens
- **Validation**: express-validator
- **Security**: helmet, cors, rate limiting

### Deployment
- **Platform**: Vercel (serverless)
- **Database**: Supabase (managed PostgreSQL)

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## Versions

[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/html-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard)[<img src="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/figma-logo.jpg" width="60" height="60" />](https://www.creative-tim.com/product/material-tailwind-dashboard-react) [<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/react-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-react)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/vue-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/vue-material-dashboard)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/angular-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-angular2)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/react-native-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-kit-react-native)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/laravel-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-laravel)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/vuetify-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/vuetify-material-dashboard)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/django-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-django)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/nextjs-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/nextjs-material-dashboard)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/flask-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-flask)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/aspnet-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-react-asp-net)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/nodejs-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-dashboard-react-nodejs)

| Bootstrap 5                                                                                                                                                                                | Bootstrap 4                                                                                                                                                                                           | Bootstrap 3                                                                                                                                                                                          | Dark HTML                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Material Dashboard  HTML](https://s3.amazonaws.com/creativetim_bucket/products/50/original/material-dashboard.jpg?1634648873)](https://www.creative-tim.com/product/material-dashboard) | [![Material Dashboard  Bootstrap 4](https://s3.amazonaws.com/creativetim_bucket/products/537/original/opt_md_thumbnail.jpeg?1634047548)](https://www.creative-tim.com/product/material-dashboard-bs4) | [![Material Dashboard  Bootstrap 3](https://s3.amazonaws.com/creativetim_bucket/products/78/original/opt_mdp_thumbnail.jpg?1521133551)](https://www.creative-tim.com/product/material-dashboard-bs4) | [![Material Dashboard Dark Edition](https://s3.amazonaws.com/creativetim_bucket/products/95/original/opt_mdb_thumbnail.jpg?1535551949)](https://www.creative-tim.com/product/material-dashboard-dark) |

| React                                                                                                                                                                                                                      | Tailwind                                                                                                                                                                                                        | Vue                                                                                                                                                                                            | Angular                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [![Material Dashboard  React](https://s3.amazonaws.com/creativetim_bucket/products/488/original/material-tailwind-react-dashboard.jpg?1667367968)](https://www.creative-tim.com/product/material-tailwind-dashboard-react) | [![Material Tailwind Dashboard React](https://s3.amazonaws.com/creativetim_bucket/products/71/original/material-dashboard-react.jpg?1638950990)](https://www.creative-tim.com/product/material-dashboard-react) | [![Vue Material Dashboard](https://s3.amazonaws.com/creativetim_bucket/products/81/original/opt_md_vue_thumbnail.jpg?1534938464)](https://www.creative-tim.com/product/vue-material-dashboard) | [![Material Dashboard  Angular](https://s3.amazonaws.com/creativetim_bucket/products/53/original/opt_md_angular_thumbnail.jpg?1551358074)](https://www.creative-tim.com/product/material-dashboard-angular2) |

| Vuetify                                                                                                                                                                                           | React Native                                                                                                                                                                | Nextjs                                                                                                                                                                                        | Nodejs                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Material Dashboard  Vuetify](https://s3.amazonaws.com/creativetim_bucket/products/100/original/opt_md_vuetify_thumbnail.jpg)](https://www.creative-tim.com/product/vuetify-material-dashboard) | [![React Native](https://s3.amazonaws.com/creativetim_bucket/products/144/original/opt_mkrn_thumbnail.jpg)](https://www.creative-tim.com/product/material-kit-react-native) | [![Nextjs Material Dashboard](https://s3.amazonaws.com/creativetim_bucket/products/341/original/opt_md_nextjs_thumbnail.jpg)](https://www.creative-tim.com/product/nextjs-material-dashboard) | [![Material Dashboard React Nodejs](https://s3.amazonaws.com/creativetim_bucket/products/157/original/react-material-dashboard-nodejs.jpg?1680251614)](https://www.creative-tim.com/product/material-dashboard-react-nodejs) |

| Laravel                                                                                                                                                                                                       | Asp.NET                                                                                                                                                                            | Django                                                                                                                                                                                        | Flask                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [![Material Dashboard Laravel](https://s3.amazonaws.com/creativetim_bucket/products/154/original/material-dashboard-laravel.jpg?1664460694)](https://www.creative-tim.com/product/material-dashboard-laravel) | [![Asp.NET](https://s3.amazonaws.com/creativetim_bucket/products/397/original/opt_md_aspnet_thumbnail.jpg)](https://www.creative-tim.com/product/material-dashboard-react-asp-net) | [![Material Dashboard Django](https://s3.amazonaws.com/creativetim_bucket/products/337/original/opt_md_django_thumbnail.jpg)](https://www.creative-tim.com/product/material-dashboard-django) | [![Material Dashboard Flask](https://s3.amazonaws.com/creativetim_bucket/products/338/original/opt_md_flask_thumbnail.jpg)](https://www.creative-tim.com/product/material-dashboard-flask) |

## Demo

- [Start page](https://demos.creative-tim.com/material-dashboard/examples/dashboard.html)
- [User profile page](https://demos.creative-tim.com/material-dashboard/examples/user.html)
- [Tables page ](https://demos.creative-tim.com/material-dashboard/examples/tables.html)
- [Maps Page](https://demos.creative-tim.com/material-dashboard/examples/map.html)
- [Notifications page](https://demos.creative-tim.com/material-dashboard/examples/notifications.html)

[View More](https://demos.creative-tim.com/material-dashboard/examples/dashboard.html).

## Quick start

- `npm i material-dashboard`
- Clone the repo: `git clone https://github.com/creativetimofficial/material-dashboard.git`.
- [Download from Github](https://github.com/creativetimofficial/material-dashboard/archive/master.zip).
- [Download from Creative Tim](https://www.creative-tim.com/product/material-dashboard).

## Deploy

:rocket: You can deploy your own version of the template to Genezio with one click:

[![Deploy to Genezio](https://raw.githubusercontent.com/Genez-io/graphics/main/svg/deploy-button.svg)](https://app.genez.io/start/deploy?repository=https://github.com/creativetimofficial/material-dashboard&utm_source=github&utm_medium=referral&utm_campaign=github-creativetim&utm_term=deploy-project&utm_content=button-head)

## Documentation

The documentation for the Material Dashboard is hosted at our [website](https://demos.creative-tim.com/material-dashboard/docs/2.1/getting-started/introduction.html).

## File Structure

Within the download you'll find the following directories and files:

```
material-dashboard
    ├── assets
    │   ├── css
    │   ├── fonts
    │   ├── img
    │   ├── js
    │   │   ├── core
    │   │   ├── plugins
    │   │   └── material-dashboard.js
    │   │   └── material-dashboard.js.map
    │   │   └── material-dashboard.min.js
    │   └── scss
    │       ├── material-dashboard
    │       └── material-dashboard.scss
    ├── docs
    │   ├── documentation.html
    ├── pages
    ├── CHANGELOG.md
    ├── gulpfile.mjs
    ├── package.json
```

## Browser Support

At present, we officially aim to support the last two versions of the following browsers:

<img src="https://s3.amazonaws.com/creativetim_bucket/github/browser/chrome.png" width="64" height="64"> <img src="https://s3.amazonaws.com/creativetim_bucket/github/browser/firefox.png" width="64" height="64"> <img src="https://s3.amazonaws.com/creativetim_bucket/github/browser/edge.png" width="64" height="64"> <img src="https://s3.amazonaws.com/creativetim_bucket/github/browser/safari.png" width="64" height="64"> <img src="https://s3.amazonaws.com/creativetim_bucket/github/browser/opera.png" width="64" height="64">

## Resources

- Demo: <https://demos.creative-tim.com/material-dashboard/pages/dashboard.html>
- Download Page: <https://www.creative-tim.com/product/material-dashboard>
- Documentation: <https://demos.creative-tim.com/material-dashboard/docs/2.1/getting-started/introduction.html>
- License Agreement: <https://www.creative-tim.com/license>
- PRO Version: <https://www.creative-tim.com/product/material-dashboard-pro>
- Support: <https://www.creative-tim.com/contact-us>
- Issues: [Github Issues Page](https://github.com/creativetimofficial/material-dashboard/issues)
- [Material Kit](https://www.creative-tim.com/product/material-kit?ref=github-md-free) - For Front End Development
- [Nepcha Analytics](https://nepcha.com?ref=readme) - Analytics tool for your website

## Reporting Issues

We use GitHub Issues as the official bug tracker for the Material Dashboard. Here are some advices for our users that want to report an issue:

1. Make sure that you are using the latest version of the Material Dashboard. Check the CHANGELOG from your dashboard on our [website](https://www.creative-tim.com/).
2. Providing us reproducible steps for the issue will shorten the time it takes for it to be fixed.
3. Some issues may be browser specific, so specifying in what browser you encountered the issue might help.

## Upgrade to Premium version

Are you looking for more components? Please check our Premium Version of Material Dashboard [here](https://www.creative-tim.com/product/material-dashboard-pro/)

## Technical Support or Questions

If you have questions or need help integrating the product please [contact us](https://www.creative-tim.com/contact-us) instead of opening an issue.

## Licensing

- Copyright 2024 Creative Tim (https://www.creative-tim.com/)
- Licensed under MIT (https://github.com/creativetimofficial/material-dashboard/blob/master/LICENSE.md)

## Useful Links

- [More products](https://www.creative-tim.com/templates?ref=readme-sudp) from Creative Tim
- [Tutorials](https://www.youtube.com/channel/UCVyTG4sCw-rOvB9oHkzZD1w)
- [Freebies](https://www.creative-tim.com/bootstrap-themes/free?ref=readme-sudp) from Creative Tim
- [Affiliate Program](https://www.creative-tim.com/affiliates/new?ref=readme-sudp) (earn money)
- [Bundles](https://www.creative-tim.com/bundles)
- [Material Design](https://www.creative-tim.com/design-system/material)
- [Get Discount](https://www.creative-tim.com/coupon)

##### Social Media

Twitter: <https://twitter.com/CreativeTim>

Facebook: <https://www.facebook.com/CreativeTim>

Dribbble: <https://dribbble.com/creativetim>

TikTok: <https://tiktok.com/@creative.tim>

Instagram: <https://instagram.com/creativetimofficial>
