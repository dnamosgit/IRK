# Office data verification procedure

## Current state (honest)

`db/seed/offices.ts` contains 15 offices: 13 immigration offices and 2 airport facilities. During the build, the development environment **could not reach** `immigration.go.kr` or `hikorea.go.kr`, so:

- Only office **names** (KO / EN / ES) and the city/region are seeded. Names follow the publicly known Korea Immigration Service office structure and **still need confirmation**.
- Address, telephone, website, appointment URL, opening hours and services are **empty**. The site shows "Information not yet verified" and states that contact details are withheld until verification.
- Coordinates are **approximate city centres** (`location_precision = approximate_city`). The map and office pages say so explicitly. Two offices that share a city share a marker.
- `data_status = 'unverified'` and `last_verified_at = NULL` for every record.
- Branch offices (출장소) are not yet seeded. Add them through the admin once verified.

## Verifying a record (data administrator)

1. Open the official Korea Immigration Service office directory (https://www.immigration.go.kr → 기관소개 / 출입국·외국인관서) and the office's own page.
2. In **/admin/offices/{id}**:
   - Correct the official Korean name, English and Spanish names, office type and region.
   - Enter the address (KO, plus EN/ES romanization where the office publishes one), telephone, website and appointment URL **exactly as published**.
   - Enter coordinates for the building entrance and set precision to `exact`, only if you can confirm the location.
   - Tick only the services the official page lists.
   - Under **Source references**, add the official URL with today's access date.
3. Click **Mark as verified today**. This is refused unless an official source with an access date exists. The public page then shows the contact details and the verification date.
4. Re-verify at least every 6 months, or whenever a user reports outdated information through **Report a problem**. Use **Mark as outdated** to show a warning banner while you check.

Every change is written to `private.office_updates` and the audit log.

## Never

- Copy addresses or phone numbers from unofficial sites, maps or memory.
- Invent opening hours, fees, document requirements or processing times.
- Use photos that imply they show a specific office unless the location is verified and the image is licensed.
