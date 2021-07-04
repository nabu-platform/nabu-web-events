# On Event

You can stop an event from firing by _not_ returning it in the output. So make sure you _do_ map it if you don't want it dropped.

## Examples

On event can be used to enrich events, for example:

- ip resolving for geolocation via ipstack
- session recording where we push a number of events from the frontend, store it in a large blob and on disconnect, we fire a single event with the entire session in it