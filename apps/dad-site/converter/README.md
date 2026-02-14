This is a converter that takes .wps files and converts them to Astro .md files for the Poetry Collection within dad-site.

GitHub Copilot Agent may edit and reformat this README to any extent needed.

This folder contains two subfolders:
- input - contains .wps files for conversion
- output - converted .md files get put here

Create additional folders and files as needed and in any structure you see fit.

There exists already a `scripts` folder at `slater-sites/apps/dad-site/scripts` should you see fit to use it.

A sample file called `poem-title` shows expected output and can be found in the `output` subfolder for reference.

Conversion rules and notes for outputting .md files:
- file names shall be all lower case with dashes between words; numbers are ok
- frontmatter fields
  - title should be rendered however it is in the .wps file, whether title case, all caps, etc. If no title in .wps file, use file name
  - date should be pulled from the content of the .wps file if found - might be in the header, might be after the poem. if no date is found, use the creation date or any date found in the .wps file properties
  - tags - use your judgement based on the poem to assign up to 5 tags. acceptable tag styles can be seen in the sample file `poem-title` - consult existing tag library to avoid creating additional similar tags - see `apps/dad-site/src/utils/tags.ts`
  - excerpt - use first 140-180 characters of poem. do not cut off mid-word. do not end in ellipses. do not add any ending punctuation that does not exist in the poem text referenced. try to end the excerpt based on the end of a poem sentence ending in a period - if that point falls within the 140-180 characters

Poem body as output in .md files:
- Every line shall end in two spaces, unless it is the last line of a stanza or the last line of the poem
- Blank line between stanzas
- One blank line at the end of the file
- Ignore any creative indentations you find in the source .wps
