import { createTreeCollection, Icon, Stack, TreeView } from "@chakra-ui/react";
import { Folder, Trash } from "lucide-react";
import type { FunctionComponent } from "react";

interface SecretsSidebarProps {}

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

const collection = createTreeCollection<Node>({
  nodeToString: (node) => node.name,
  nodeToValue: (node) => node.id,
  rootNode: {
    children: [
      {
        children: [
          { id: "node_modules/zag-js", name: "zag-js" },
          { id: "node_modules/pandacss", name: "panda" },
          {
            children: [
              { id: "node_modules/@types/react", name: "react" },
              { id: "node_modules/@types/react-dom", name: "react-dom" },
            ],
            id: "node_modules/@types",
            name: "@types",
          },
        ],
        id: "node_modules",
        name: "node_modules",
      },
      {
        children: [
          { id: "src/app.tsx", name: "app.tsx" },
          { id: "src/index.ts", name: "index.ts" },
        ],
        id: "src",
        name: "src",
      },
      { id: "panda.config", name: "panda.config.ts" },
      { id: "package.json", name: "package.json" },
      { id: "renovate.json", name: "renovate.json" },
      { id: "readme.md", name: "README.md" },
    ],
    id: "ROOT",
    name: "",
  },
});

const SecretsSidebar: FunctionComponent<SecretsSidebarProps> = () => {
  return (
    <>
      <Stack>
        <TreeView.Root collection={collection}>
          {/* <TreeView.Label>Tree</TreeView.Label> */}
          <TreeView.Tree>
            <TreeView.Node
              indentGuide={<TreeView.BranchIndentGuide />}
              render={({ node, nodeState }) =>
                nodeState.isBranch ? (
                  <TreeView.BranchControl rounded={"none"}>
                    <Icon>
                      <Folder />
                    </Icon>
                    <TreeView.BranchText>{node.name}</TreeView.BranchText>
                  </TreeView.BranchControl>
                ) : (
                  <TreeView.Item rounded={"none"}>
                    <Icon>
                      <Trash />
                    </Icon>
                    <TreeView.ItemText>{node.name}</TreeView.ItemText>
                  </TreeView.Item>
                )
              }
            />
          </TreeView.Tree>
        </TreeView.Root>
      </Stack>
    </>
  );
};

export default SecretsSidebar;
