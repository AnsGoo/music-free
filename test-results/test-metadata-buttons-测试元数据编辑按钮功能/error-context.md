# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "音乐服务器" [level=1] [ref=e3]
  - generic [ref=e5]:
    - heading "登录" [level=2] [ref=e6]
    - generic [ref=e7]:
      - generic [ref=e8]: 用户名
      - textbox "用户名" [ref=e9]:
        - /placeholder: admin
        - text: admin
    - generic [ref=e10]:
      - generic [ref=e11]: 密码
      - textbox "密码" [ref=e12]:
        - /placeholder: admin
        - text: admin
    - button "登录" [ref=e13] [cursor=pointer]
```