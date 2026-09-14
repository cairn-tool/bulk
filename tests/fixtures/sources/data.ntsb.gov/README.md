# data.ntsb.gov fixtures

Hand-written in the shapes recorded on 2026-09-13 (docs/sources/ntsb-*/access.md): the docket search form with its antiforgery token and cookie (the POST is refused without both), a three-row all-time result (one project with two sub-dockets), a server-rendered docket page with two sub-docket blocks and a `docBLOB` link whose FileName is wrong (a 0-byte 200, the endpoint's one trap); the CAROL session/template/count/export flow with a data zip and a BOM-prefixed summary CSV naming a carol-repgen report; the avdata directory listing with three files.
