import Resource from "./Resource";

/**
 * See https://developer.apple.com/legacy/library/documentation/mac/pdf/MoreMacintoshToolbox.pdf#page=151
 * for more information on resource forks.
 */
type ResourceMap = Partial<Record<string, Resource[]>>;

export default ResourceMap;
